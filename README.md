# 📚 ExamAI / CodeLens - Nền tảng Kiểm Tra Lập Trình Bằng AI

Chào mừng đến với **ExamAI** (CodeLens), một hệ thống kiểm tra và đánh giá năng lực lập trình ứng dụng sức mạnh của AI (Google Gemini) kết hợp với Firebase. 
Dự án cho phép giáo viên tạo các bài kiểm tra lập trình, và học sinh có thể tham gia giải bài trực tiếp trên trình duyệt. Bài làm sẽ được chấm điểm và phản hồi chi tiết tự động bởi AI.

## 🌟 Tính Năng Nổi Bật

1. **Dành cho Giáo viên (Teacher Dashboard):**
   * Đăng nhập an toàn qua hệ thống Firebase Authentication.
   * Quản lý API Key của Google Gemini.
   * Tạo bài kiểm tra lập trình mới và Quản lý đề thi (Phát đề/Thu đề/Xoá đề thi).
   * Theo dõi kết quả thi của học sinh thời gian thực (Live Monitor).
   * 🧠 **Phân Tích Lớp Học:** Nhờ AI tóm tắt lỗi sai phổ biến của cả lớp để lên kế hoạch ôn tập.
   * 📥 **Xuất Excel (CSV):** Tải bảng điểm học sinh cực kỳ nhanh chóng.

2. **Dành cho Học sinh (Student Interface):**
   * Tham gia thi bằng cách nhập Tên và Lớp.
   * Làm bài trong môi trường soạn thảo code tích hợp trực tiếp trên trình duyệt (sử dụng CodeMirror 6).
   * Giao diện bài thi trực quan, dễ sử dụng.

3. **Chấm bài tự động với AI:**
   * Sau khi nộp bài, Gemini AI sẽ tự động phân tích mã nguồn của học sinh.
   * 🎯 **Chấm điểm đa chiều:** Đánh giá dựa trên 3 tiêu chí cốt lõi: Tư duy Logic (50%), Cú pháp (20%), và Clean Code (30%).
   * Cung cấp nhận xét chi tiết (Feedback) và hiển thị kết quả bằng các thanh tiến trình trực quan.

4. **Giao diện hiện đại & Dark Mode:**
   * Hệ thống UI xây dựng hoàn toàn bằng Tailwind CSS v4 với hiệu ứng Glassmorphism.
   * Hỗ trợ chuyển đổi nhanh giữa chế độ Sáng/Tối.
   * Toast notifications thời gian thực báo trạng thái lỗi/thành công.

## 🛠️ Công Nghệ Sử Dụng

* **Frontend:** React 19, Vite 8, Tailwind CSS v4
* **Trình soạn thảo mã nguồn:** UIW React CodeMirror 6
* **Database & Auth:** Firebase (Firestore, Authentication)
* **Trí tuệ nhân tạo:** Google Gemini API (gemini-3.1-flash-lite) để chấm điểm và phân tích code.

## 📖 Hướng Dẫn Cài Đặt & Chạy Cục Bộ

1. **Yêu cầu hệ thống:** NodeJS 18+, npm.
2. **Cài đặt thư viện:** Chạy lệnh `npm install`
3. **Cấu hình Firebase:** 
   * Đổi tên file `.env.example` thành `.env`.
   * Điền thông tin cấu hình Firebase vào file `.env`.
4. **Khởi chạy Development Server:** Chạy lệnh `npm run dev`

## 🚀 Hướng Dẫn Triển Khai (Deploy) lên GitHub Pages

Dự án đã được cấu hình sẵn để dễ dàng deploy lên GitHub Pages thông qua `gh-pages`.

1. Đảm bảo bạn đã cấu hình đúng đường dẫn `base` trong `vite.config.js` (ví dụ: `base: '/edubot/'`).
2. Chạy lệnh sau để tự động build và push lên nhánh `gh-pages`:
   ```bash
   npm run deploy
   ```
3. Truy cập vào phần Settings > Pages của kho chứa trên GitHub và đảm bảo Source được chọn là nhánh `gh-pages`.
