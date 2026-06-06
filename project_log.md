# TÀI LIỆU DỰ ÁN & NHẬT KÝ LỊCH SỬ NÂNG CẤP (PROJECT LOG)

## 1. Thông tin chung về dự án

*   **Tên dự án:** ExamAI (tên nội bộ CodeLens) - Nền tảng thi lập trình với AI
*   **Mô hình kiến trúc:** Client-side React 19 SPA tích hợp BaaS (Firebase).
*   **Mục tiêu chính:** Cung cấp môi trường cho giáo viên tổ chức thi lập trình và học sinh làm bài thi trực tiếp trên web. Ứng dụng Gemini AI vào việc tự động chấm code và đưa ra nhận xét chi tiết cho người học.

## 2. Cấu trúc dự án

```text
src/
├── components/
│   ├── FinalResults.jsx     # Hiển thị điểm và nhận xét từ AI
│   ├── QuizSession.jsx      # Phiên làm bài của học sinh (tích hợp CodeMirror)
│   ├── StudentInfoForm.jsx  # Form nhập thông tin thí sinh
│   ├── TeacherDashboard.jsx # Nơi GV tạo đề thi và xem kết quả
│   ├── TeacherLogin.jsx     # Màn hình đăng nhập GV
│   ├── ThemeToggle.jsx      # Nút chuyển giao diện Sáng/Tối
│   └── WelcomeScreen.jsx    # Màn hình chính điều hướng GV/HS
├── App.jsx                  # State Machine điều phối toàn bộ luồng ứng dụng
├── firebase.js              # Cấu hình Firestore và Auth
├── index.css                # CSS toàn cục và animation
└── main.jsx                 # Entry point khởi chạy ứng dụng
```

## 3. Nhật ký cập nhật

### 🟢 Nâng cấp kiến trúc sang Hệ thống Thi/Kiểm tra (ExamAI)
*   **Thay đổi nghiệp vụ:** Đã chuyển đổi từ một công cụ "Hỗ trợ làm bài tập/Quét ảnh đề bài" đơn lẻ sang một **Hệ thống Quản lý bài thi lớp học** hoàn chỉnh với vai trò Giáo viên và Học sinh riêng biệt.
*   **Tích hợp Firebase (BaaS):**
    *   Thêm file `firebase.js` sử dụng Firebase Authentication để xử lý đăng nhập cho giáo viên.
    *   Sử dụng Cloud Firestore làm cơ sở dữ liệu tập trung lưu trữ `exams` (đề thi do giáo viên tạo) và `exam_results` (kết quả bài làm của học sinh).
*   **Quy trình (Workflow) mới:**
    *   State Machine tại `App.jsx` điều hướng 6 trạng thái cốt lõi: `welcome`, `teacher_login`, `teacher_dashboard`, `student_info`, `quiz`, `results`.
    *   Giáo viên tạo đề thi gồm nhiều câu hỏi. Đề thi được đánh dấu kích hoạt (Active) sẽ hiển thị cho học sinh trên toàn hệ thống.
    *   Học sinh nhập Tên và Lớp, sau đó làm bài bằng CodeMirror Editor.
    *   Sử dụng Gemini API để đối chiếu mã nguồn học sinh nộp với `sampleSolution` của giáo viên để chấm điểm. Kết quả sau đó được đẩy lưu trữ ngược lên Firestore.

---
*Tài liệu được cập nhật mới nhất để phản ánh luồng kiến trúc mới của ExamAI.*
