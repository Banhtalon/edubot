# DANH SÁCH & PHÂN TÍCH CÁC CÔNG NGHỆ SỬ DỤNG

Tài liệu này phân tích chi tiết về các công nghệ, thư viện và giải pháp kỹ thuật được áp dụng trong **ExamAI** (CodeLens).

---

## 1. Tổng quan Kiến trúc Hệ thống
Ứng dụng vận hành theo mô hình **BaaS (Backend as a Service)** thông qua việc sử dụng hệ sinh thái Firebase kết hợp cùng với giao diện Web (Client-side) được xây dựng trên nền tảng React 19 và Vite.

---

## 2. Chi tiết Công nghệ Frontend & Libraries

| Công nghệ | Phiên bản | Vai trò & Đặc điểm kỹ thuật |
| :--- | :--- | :--- |
| **React** | `v19.2.6` | Quản lý giao diện, vòng đời (lifecycle), và State machine cho toàn bộ luồng sử dụng. Cho phép tạo các component tái sử dụng cao. |
| **Vite** | `v8.0.12` | Đóng gói (Bundler) cực kỳ nhanh với khả năng Hot Module Replacement (HMR) hiệu suất cao trong môi trường dev. |
| **Tailwind CSS v4** | `v4.3.0` | Công cụ Styling sử dụng utility-first classes, hỗ trợ Dark Mode (qua class `.dark`) và custom animation mượt mà. |
| **React CodeMirror** | `v4.25.10` | Cung cấp môi trường gõ code cho học sinh trực tiếp trên trình duyệt web. Có hỗ trợ tự thụt lề và tô màu cú pháp (Syntax Highlighting) theo các gói đa ngôn ngữ. |

---

## 3. Quản trị Dữ liệu & Xác thực (Firebase)

Dự án không có server backend tự viết mà giao tiếp hoàn toàn qua Firebase SDK (Web).

*   **Firebase Authentication:**
    *   Sử dụng cơ chế đăng nhập bằng Email/Password để định danh tài khoản Giáo viên.
    *   Hỗ trợ quản lý và khôi phục phiên đăng nhập thông qua `onAuthStateChanged`.
*   **Cloud Firestore (NoSQL Database):**
    *   **Collection `exams`**: Chứa thông tin các đề thi do giáo viên tạo ra. Bao gồm: tiêu đề đề thi, danh sách các câu hỏi, gợi ý, đáp án mẫu (`sampleSolution`) và cờ trạng thái kích hoạt `isActive`.
    *   **Collection `exam_results`**: Chứa bảng ghi nhận bài thi của học sinh sau khi hoàn thành. Bao gồm: tên học sinh, lớp, tổng điểm cuối cùng, và nhận xét chấm điểm (feedback) chi tiết cho từng câu hỏi.
    *   Hỗ trợ query nhanh chóng thông qua `query`, `where`, và `orderBy` để cấp quyền truy xuất cho `TeacherDashboard`.

---

## 4. Trí tuệ Nhân tạo (Google Gemini)

*   **Mô hình AI:** `gemini-3.1-flash-lite`
*   **Nhiệm vụ chính:**
    *   **Giám khảo ảo:** Đối chiếu mã nguồn học sinh với `sampleSolution`. Chấm điểm theo 3 chiều (Logic 50%, Syntax 20%, Clean Code 30%) và trả về định dạng JSON nghiêm ngặt (`responseSchema` chứa các trường `logicScore`, `syntaxScore`, `cleanScore`).
    *   **Trợ lý sư phạm:** Quét toàn bộ nhận xét của một lớp học, tổng hợp lỗi sai phổ biến và viết một báo cáo trực tiếp cho Giáo viên thông qua tính năng *Phân Tích Lớp Học*.
*   **Lưu trữ API Key:** Khóa API của mô hình Gemini được giáo viên nhập vào thiết lập một lần trên Dashboard và được lưu tại `localStorage`, giúp gọi trực tiếp API qua fetch tại phía client một cách bảo mật tương đối theo phiên người dùng.

---

## 5. State Machine & Quản lý Luồng (Flow Management)
*   Sử dụng State Machine đơn giản trong file `App.jsx` (qua state `appState`) để kiểm soát nghiêm ngặt hành trình của người dùng.
*   Ứng dụng chia làm 6 trạng thái màn hình rõ ràng: `welcome`, `teacher_login`, `teacher_dashboard`, `student_info`, `quiz`, `results`.
*   Cơ chế này ngăn chặn người dùng (đặc biệt là học sinh) truy cập ngẫu nhiên vào các màn hình bất hợp lệ nếu thiếu dữ liệu ngữ cảnh (ví dụ: Không thể vào xem điểm trang `results` nếu phiên thi chưa được hoàn tất ở `quiz`).
