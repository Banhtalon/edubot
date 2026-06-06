import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// =============================================
// FIREBASE CONFIG
// =============================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Khởi tạo an toàn
export let db = null;
export let auth = null;
export let isFirebaseReady = false;

try {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    isFirebaseReady = true;
  } else {
    console.warn('⚠️ Firebase chưa được cấu hình. Tạo file .env theo .env.example');
  }
} catch (err) {
  console.error('Firebase init error:', err.message);
}

/* ─────────────── EXAMS ─────────────── */

export async function saveExam({ title, questions, duration, leaderboardEnabled }) {
  return await addDoc(collection(db, 'exams'), {
    title,
    questions,
    duration: duration || 0, // 0 nghĩa là không giới hạn
    leaderboardEnabled: leaderboardEnabled || false,
    isActive: false,
    createdAt: serverTimestamp(),
  });
}

export async function getExams() {
  const q = query(collection(db, 'exams'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function setExamActive(examId, isActive) {
  return await updateDoc(doc(db, 'exams', examId), { isActive });
}

export async function getActiveExam() {
  const q = query(collection(db, 'exams'), where('isActive', '==', true));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/* ─────────────── EXAM SESSIONS (RESULTS) ─────────────── */

/**
 * Khởi tạo phiên thi khi học sinh bắt đầu làm bài
 */
export async function initExamSession({ studentName, className, examId, examTitle }) {
  const docRef = await addDoc(collection(db, 'exam_results'), {
    studentName,
    className,
    examId,
    examTitle,
    status: 'doing', // 'doing' | 'completed'
    cheatCount: 0,
    startedAt: serverTimestamp(),
    submittedAt: null,
    totalScore: 0,
    questionDetails: [],
  });
  return docRef.id;
}

/**
 * Cập nhật tiến trình làm bài hoặc gian lận (Realtime)
 */
export async function updateExamProgress(sessionId, data) {
  if (!sessionId) return;
  return await updateDoc(doc(db, 'exam_results', sessionId), data);
}

/**
 * Nộp bài chính thức
 */
export async function submitFinalExam(sessionId, { totalScore, questionDetails }) {
  if (!sessionId) return;
  return await updateDoc(doc(db, 'exam_results', sessionId), {
    status: 'completed',
    totalScore,
    questionDetails,
    submittedAt: serverTimestamp(),
  });
}

/**
 * Lắng nghe kết quả thi thời gian thực (cho TeacherDashboard và Leaderboard)
 * Trả về hàm unsubscribe để hủy lắng nghe
 */
export function subscribeToExamResults(examId, callback) {
  const q = query(collection(db, 'exam_results'), where('examId', '==', examId));
  return onSnapshot(q, (snapshot) => {
    const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sắp xếp trên client: 
    // Trạng thái 'doing' lên đầu, sau đó sắp theo điểm giảm dần, rồi thời gian nộp
    results.sort((a, b) => {
      if (a.status === 'doing' && b.status !== 'doing') return -1;
      if (a.status !== 'doing' && b.status === 'doing') return 1;
      if (a.status === 'completed' && b.status === 'completed') {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        const timeA = a.submittedAt?.toMillis?.() || 0;
        const timeB = b.submittedAt?.toMillis?.() || 0;
        return timeA - timeB; // Nộp trước xếp trên
      }
      return 0;
    });
    callback(results);
  });
}
