# TÀI LIỆU DỰ ÁN & NHẬT KÝ LỊCH SỬ NÂNG CẤP (PROJECT LOG)

Tài liệu này cung cấp cái nhìn toàn diện về cấu trúc, các thành phần và nhật ký phát triển của ứng dụng **Học Dễ Dàng - Trợ Lý Giải Bài Tập AI**.

---

## 1. Thông tin chung về dự án

*   **Tên dự án:** Học Dễ Dàng - Trợ Lý Giải Bài Tập AI (Easy Study AI - Multi-Language Homework Helper)
*   **Mô hình kiến trúc:** Single Page Application (SPA) xây dựng trên nền tảng **Vite** và **React 19**, chạy hoàn toàn ở phía máy khách (Client-side).
*   **Mục tiêu chính:** Hỗ trợ học sinh học lập trình nhiều ngôn ngữ (Python, C++, Scratch, GameMaker) thông qua quét ảnh đề bài, hướng dẫn giải chi tiết, cung cấp code mẫu, tích hợp trình biên soạn CodeMirror, hỗ trợ chạy thử mã nguồn cục bộ hoặc giả lập bằng AI, chấm điểm và lưu trữ tiến độ.

---

## 2. Cấu trúc thư mục dự án (Project Directory Structure)

Dự án hiện tại được tổ chức theo chuẩn ứng dụng Vite + React hiện đại:

```text
giai python/
│
├── public/                 # Thư mục chứa các tài nguyên tĩnh
├── src/                    # Thư mục mã nguồn chính
│   ├── assets/             # Các tệp tin ảnh, logo
│   ├── components/         # Các Component giao diện độc lập (Modular Components)
│   │   ├── CodePlayground.jsx    # Soạn thảo code CodeMirror & render Scratchblocks
│   │   ├── HistorySidebar.jsx    # Danh sách lịch sử bài tập lưu localStorage
│   │   ├── LanguageSelector.jsx  # Chọn lựa 4 ngôn ngữ lập trình
│   │   ├── ProgressDashboard.jsx # Bảng thống kê điểm số & tiến độ dạng biểu đồ
│   │   ├── SolutionDetails.jsx   # Tab đáp án & hướng dẫn giải chi tiết
│   │   └── ThemeToggle.jsx       # Bật tắt giao diện sáng/tối (Dark/Light mode)
│   │
│   ├── App.jsx             # Component chính kết nối logic trạng thái ứng dụng
│   ├── index.css           # Cấu hình Tailwind CSS v4 & custom animations/scrollbars
│   └── main.jsx            # Entry point khởi tạo React DOM
│
├── index.html              # Trang HTML gốc, nạp Pyodide & Scratchblocks từ CDN
├── package.json            # Quản lý thư viện phụ thuộc và lệnh chạy (scripts)
├── vite.config.js          # Cấu hình bộ biên dịch Vite & Tailwind CSS plugin
├── cac_cong_nghe_su_dung.md # Tài liệu chi tiết về các giải pháp công nghệ
└── project_log.md          # [Tệp hiện tại] Nhật ký dự án và lịch sử nâng cấp
```

---

## 3. Nhật ký lịch sử phiên bản (Version History)

### 🔴 Phiên bản 1.0 (Bản gốc - Backup tĩnh)
*   **Cấu trúc:** Một file HTML tĩnh duy nhất `giai_bai_tap.html` kèm file logic `app.js` và style `styles.css`.
*   **Thư viện:** React 18, Tailwind CSS v3 và Babel Standalone chạy trực tiếp qua các link CDN unpkg. CodeMirror phiên bản 5.
*   **Chức năng:** Chỉ giải được bài tập Python. Không có lịch sử bài tập, không có thống kê điểm, không có chế độ tối chủ động và chạy code.

### 🟢 Phiên bản 1.1 (Phiên bản nâng cấp hiện tại - Vite + React 19)
*   **Tái cấu trúc (Refactoring):**
    *   Chuyển đổi hoàn toàn sang dự án Node.js quản lý bằng **npm** và đóng gói bằng **Vite 8**.
    *   Nâng cấp lên **React 19** và tách mã nguồn thành 6 component độc lập giúp bảo trì dễ dàng.
    *   Tích hợp **Tailwind CSS v4** thông qua bộ tiền xử lý compiler `@tailwindcss/vite` đem lại hiệu suất CSS tối ưu.
    *   Nâng cấp lên **React CodeMirror 6** với các gói ngôn ngữ phân tích cú pháp chuẩn (`@codemirror/lang-*`).
*   **Chức năng mới nâng cấp:**
    *   **Thêm Dark Mode:** Nút toggle chuyển giao diện, đồng bộ hóa cả theme CodeMirror và lưu trạng thái ưu tiên vào `localStorage`.
    *   **Mở rộng đa ngôn ngữ:** Hỗ trợ giải bài tập và viết mã nguồn cho **Python**, **C++**, **Scratch**, và **GameMaker Language (GML)**.
    *   **Chạy code WebAssembly (Python):** Tích hợp công cụ **Pyodide** chạy trực tiếp mã Python của học sinh trên trình duyệt, có Terminal bắt log stdout/stderr thời gian thực.
    *   **Giả lập chạy code bằng AI (C++, Scratch, GML):** Gửi mã nguồn lên Gemini để dự đoán logic và xuất kết quả chạy console giả lập chi tiết.
    *   **Trực quan hóa Scratch Blocks:** Tích hợp bộ chuyển đổi văn bản sang khối đồ họa Scratch 3.0 trực tiếp trên giao diện (`scratchblocks`).
    *   **Mã mẫu dạng đục lỗ (Fill-in-the-blank):** Cải tiến `starterCode` thành dạng đục lỗ hiển thị 50% gợi ý đáp án trên các dòng code chính (đục lỗ 50% còn lại với ký tự `___` ở các vị trí quan trọng), đồng thời in ra đầy đủ 100% các chú thích gợi ý để học sinh dễ dàng điền và hoàn thành bài tập.
    *   **Cơ sở dữ liệu lịch sử:** Tự động lưu tất cả các bài tập, ảnh đề bài, mã nguồn tự viết và kết quả chấm điểm của AI vào `localStorage`.
    *   **Bảng điều khiển tiến độ:** Hiển thị số bài tập đã làm, điểm số trung bình và vẽ biểu đồ cột thể hiện điểm số 6 bài tập gần nhất.

---

## 4. Hướng dẫn vận hành và nâng cấp tiếp theo

### A. Cách chạy dự án dưới Local
1.  Đảm bảo máy đã cài đặt NodeJS.
2.  Chạy lệnh để cài đặt các package phụ thuộc:
    ```bash
    npm install
    ```
3.  Bắt đầu chạy server phát triển local:
    ```bash
    npm run dev
    ```
4.  Để đóng gói sản phẩm deploy lên hosting tĩnh (như Vercel/Netlify):
    ```bash
    npm run build
    ```

### B. Định hướng nâng cấp tiếp theo (Roadmap cho v1.2)
1.  **Chuyển đổi từ localStorage sang IndexedDB:** Lượng dữ liệu ảnh đề bài (Base64) lưu trữ trong `localStorage` có thể nhanh chóng làm đầy giới hạn 5MB của trình duyệt. Việc đổi sang sử dụng `IndexedDB` sẽ giúp lưu trữ hàng trăm bài tập và hình ảnh mà không lo tràn dung lượng bộ nhớ.
2.  **Chia sẻ bài tập:** Tích hợp tính năng tạo link chia sẻ, lưu trữ tạm thời bài giải lên một cơ sở dữ liệu serverless đám mây (như Firebase) để học sinh có thể chia sẻ bài làm cho bạn bè hoặc giáo viên xem.
3.  **Tối ưu hóa Pyodide Offline:** Lưu trữ gói cài đặt Pyodide vào thư mục `public` của dự án thay vì gọi CDN, giúp học sinh có thể chạy thử mã Python ngay cả khi không có kết nối Internet.

---
*Tài liệu được cập nhật tự động vào: 22-05-2026 bởi Trợ Lý AI.*
