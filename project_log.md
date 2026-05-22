# TÀI LIỆU DỰ ÁN & NHẬT KÝ HƯỚNG DẪN NÂNG CẤP (PROJECT LOG)

Tài liệu này cung cấp cái nhìn toàn diện về cấu trúc, thành phần và cách vận hành của dự án **Học Dễ Dàng - Trợ Lý Giải Bài Tập AI**. Mục tiêu của tệp tin này là giúp các nhà phát triển nhanh chóng hiểu dự án để duy trì, sửa lỗi và thực hiện các nâng cấp mở rộng trong tương lai.

---

## 1. Thông tin chung về dự án

*   **Tên dự án:** Học Dễ Dàng - Trợ Lý Giải Bài Tập AI (Easy Study AI - Python Homework Helper)
*   **Mô hình kiến trúc:** Single Page Application (SPA) chạy hoàn toàn trên máy khách (Client-side / Frontend-only).
*   **Mục tiêu chính:** Hỗ trợ học sinh học lập trình (chủ yếu là Python) thông qua việc quét ảnh đề bài, nhận diện kiến thức trọng tâm, hướng dẫn giải từng bước, cung cấp code mẫu kèm bình luận chi tiết và tích hợp trình viết code để học sinh tự làm và được AI chấm điểm tại chỗ.

---

## 2. Cấu trúc thư mục và các tệp tin nguồn

Hiện tại, dự án được tổ chức tối giản hóa để chạy trực tiếp trên trình duyệt mà không cần quy trình biên dịch phức tạp:

```text
giai python/
│
├── giai_bai_tap.html      # Tệp HTML chính (Entry point), tải các thư viện CDN và nhúng app.js
├── app.js                 # Mã nguồn React chính chứa toàn bộ logic ứng dụng và giao diện người dùng
├── styles.css             # Định nghĩa phong cách CSS tùy chỉnh cho scrollbar, hiệu ứng và CodeMirror
├── cac_cong_nghe_su_dung.md # Phân tích kỹ thuật chi tiết về các công nghệ, giao thức và API sử dụng
└── project_log.md         # [Tệp hiện tại] Nhật ký dự án, cấu trúc tệp và định hướng nâng cấp sau này
```

### Chi tiết vai trò từng tệp:

1.  **[giai_bai_tap.html](file:///e:/MINDX_project%20test/giai%20python/giai_bai_tap.html):**
    *   Nhiệm vụ: Cung cấp khung tài liệu HTML, nạp các CDN thiết yếu: Tailwind CSS, React v18, ReactDOM, Babel Standalone (để biên dịch JSX ngay trên trình duyệt), và thư viện CodeMirror (dành cho bộ soạn thảo mã nguồn).
    *   Kết nối: Liên kết trực tiếp tới [styles.css](file:///e:/MINDX_project%20test/giai%20python/styles.css) và nhúng [app.js](file:///e:/MINDX_project%20test/giai%20python/app.js) dưới dạng `<script type="text/babel">`.

2.  **[app.js](file:///e:/MINDX_project%20test/giai%20python/app.js):**
    *   Nhiệm vụ: Quản lý trạng thái ứng dụng bằng React Hooks (`useState`, `useRef`, `useEffect`, `useCallback`). 
    *   Tương tác API: Thực hiện gọi API trực tiếp đến Gemini API (`gemini-3.1-flash-lite`) để phân tích hình ảnh và chấm điểm code học sinh.
    *   Tính năng bổ trợ: Tích hợp trình soạn thảo CodeMirror cho Python, hệ thống Toast thông báo, bộ xử lý drag & drop, sao chép code vào clipboard, và xuất mã nguồn ra tệp `.py`.
    *   Render giao diện: Tích hợp các bộ lọc và định dạng tự chế (Markdown Parser, Syntax Highlighter) để chuyển đổi phản hồi từ AI thành các khối giao diện đẹp mắt.

3.  **[styles.css](file:///e:/MINDX_project%20test/giai%20python/styles.css):**
    *   Nhiệm vụ: Chứa các quy tắc CSS tùy biến bổ sung cho Tailwind CSS. Định nghĩa thanh cuộn tinh tế (custom scrollbar) cho cả sáng và tối, thiết lập hoạt ảnh mượt mà (`fadeIn`) và tùy biến giao diện của CodeMirror để đồng bộ với chủ đề Dark Mode của ứng dụng.

4.  **[cac_cong_nghe_su_dung.md](file:///e:/MINDX_project%20test/giai%20python/cac_cong_nghe_su_dung.md):**
    *   Nhiệm vụ: Tài liệu phân tích sâu về lý do lựa chọn công nghệ, cấu trúc payload gửi lên Google Gemini API, định dạng JSON Schema kiểm soát đầu ra của AI và cơ chế hoạt động của các bộ phân tích tự chế (Custom Parser).

---

## 3. Các chức năng cốt lõi (Core Features)

Dưới đây là sơ lược các module chức năng chính trong [app.js](file:///e:/MINDX_project%20test/giai%20python/app.js):

*   **Quản lý API Key:** Nhập khóa cá nhân từ giao diện, lưu trữ an toàn trong `localStorage` dưới máy khách để tránh bị lộ hoặc lạm dụng.
*   **Xử lý hình ảnh đầu vào:** Hỗ trợ kéo thả hình ảnh từ máy tính hoặc bấm chọn tệp. Dùng `FileReader` để chuyển ảnh thành chuỗi Base64 trước khi gửi lên AI.
*   **Giải bài tập thông minh (AI Exercise Solver):** Gửi ảnh kèm mô tả bổ sung lên API Gemini. AI được cấu hình để trả về chính xác một cấu trúc JSON gồm:
    *   `keyConcepts`: Tóm tắt lý thuyết.
    *   `stepByStep`: Hướng dẫn từng bước tự giải quyết.
    *   `fullSolution`: Mã nguồn hoàn chỉnh kèm bình luận giải thích chi tiết.
    *   `starterCode`: Đoạn code Python mẫu chỉ chứa bình luận hướng dẫn và dòng trống để học sinh tự lập trình.
*   **Bộ soạn thảo code (Interactive Code Playground):** Tích hợp CodeMirror hỗ trợ hiển thị số dòng, thụt đầu dòng tự động (tab = 4 spaces), thụt dòng thông minh cho ngôn ngữ Python.
*   **Hệ thống chấm bài tự động (AI Code Grader):** Giáo viên AI phân tích mã học sinh tự viết trong CodePlayground so sánh với hình ảnh bài tập gốc và đáp án chuẩn để xuất điểm số (0-100), nhận xét sửa lỗi chi tiết và cung cấp mã gợi ý sửa đổi.

---

## 4. Nhật ký nâng cấp & Cải tiến đề xuất (Upgrade Roadmap)

Để dễ dàng nâng cấp dự án sau này, dưới đây là các phương hướng cải tiến phân loại theo mức độ từ dễ đến nâng cao:

### 🌟 Mức độ 1: Cải thiện giao diện & Trải nghiệm người dùng (UX/UI)
*   **Chuyển đổi Sáng/Tối (Dark/Light Mode Toggle):** Hiện tại mã nguồn đã cài đặt một số lớp `dark:` nhưng chưa có nút chuyển đổi chủ đề thủ công trên giao diện. Cần thêm một nút toggle để lưu trạng thái theme vào `localStorage`.
*   **Mở rộng ngôn ngữ lập trình:** Hiện tại hệ thống đang cấu hình cứng cho Python. Có thể nâng cấp thêm lựa chọn ngôn ngữ (C++, Java, JavaScript) thông qua một dropdown trên UI, tự động đổi cú pháp CodeMirror và thay đổi hướng dẫn trong Prompt gửi lên Gemini.
*   **Lịch sử bài tập (History):** Sử dụng `IndexedDB` hoặc `localStorage` để lưu lại danh sách các bài tập học sinh đã tải lên giải và chấm điểm, giúp học sinh có thể xem lại bài học cũ mà không cần upload lại ảnh.

### 🚀 Mức độ 2: Tái cấu trúc mã nguồn (Refactoring)
*   **Tách nhỏ Component:** Tệp [app.js](file:///e:/MINDX_project%20test/giai%20python/app.js) đang chứa hơn 900 dòng lệnh. Nên tách nhỏ thành các tệp tin component React riêng biệt để dễ quản lý:
    *   `ApiKeyConfig.js` - Quản lý API Key.
    *   `ImageUploader.js` - Quản lý kéo thả và tải ảnh.
    *   `CodePlayground.js` - Trình soạn thảo và chấm bài.
    *   `SolutionViewer.js` - Hiển thị bài giải và hướng dẫn.
    *   `utils.js` - Chứa các hàm dùng chung (`renderSimpleMarkdown`, `renderSyntaxHighlightedCode`, `fetchWithRetry`).

### 💎 Mức độ 3: Chuyển đổi sang quy trình phát triển hiện đại (Modern Build System)
*   **Chuyển đổi sang Vite & React (npm):**
    *   *Tại sao:* Babel Standalone dịch JSX tại thời điểm chạy (runtime) trên trình duyệt làm chậm tốc độ tải trang ban đầu và khó tối ưu hóa tài nguyên.
    *   *Cách làm:* Khởi tạo dự án bằng Vite (`npm create vite@latest`), cài đặt React thông qua npm, sử dụng quy trình xây dựng (build) để tối ưu dung lượng tệp tin và sử dụng các gói thư viện chuẩn thay cho CDN link.
*   **Bảo mật API Key qua Backend (Serverless Functions / Node.js Express):**
    *   *Tại sao:* Để phân phối ứng dụng cho lượng lớn người dùng mà không yêu cầu mỗi học sinh tự tạo API Key từ AI Studio (điều này gây cản trở trải nghiệm người dùng mới).
    *   *Cách làm:* Xây dựng một API trung gian đơn giản (backend bằng Node.js, Vercel Serverless Functions hoặc Cloudflare Workers) để giữ API Key bí mật ở phía server. Khi frontend gửi ảnh lên, server sẽ thay mặt frontend gửi yêu cầu đến Google Gemini rồi chuyển kết quả lại cho máy khách.

---

## 5. Hướng dẫn sửa chữa nhanh khi gặp sự cố (Troubleshooting)

| Sự cố phát sinh | Nguyên nhân khả dĩ | Hướng xử lý |
| :--- | :--- | :--- |
| **Giao diện trắng xóa không hiển thị gì** | Lỗi cú pháp JavaScript/React hoặc CDN bị lỗi kết nối mạng. | Mở tab **Console** trong Chrome DevTools (F12) để xem thông tin lỗi cú pháp hoặc lỗi tải file. |
| **Không hiển thị Code playgound** | CodeMirror chưa được khởi tạo thành công hoặc thẻ `textarea` chưa được gán ref. | Kiểm tra hàm `handleEditorRef` xem có xảy ra lỗi khi tạo instance `CodeMirror.fromTextArea` hay không. |
| **Lỗi gọi API Gemini (HTTP Error: 400, 403, 429)** | API Key không chính xác, hết hạn mức sử dụng (Quota) hoặc định dạng payload gửi đi bị AI từ chối. | 1. Kiểm tra lại tính hợp lệ của API Key.<br>2. Xem phản hồi JSON từ Google trong tab **Network** của Chrome DevTools để biết lý do cụ thể. |
| **Lỗi phân tích JSON kết quả bài giải** | AI không trả về đúng định dạng JSON hoặc bọc JSON trong các ký tự lạ. | Bộ dọn dẹp chuỗi JSON trong `app.js` (`replace(/^```json/im, "")`) cần được tối ưu để xử lý mọi trường hợp AI trả về văn bản thừa trước hoặc sau khối JSON. |

*Tài liệu được cập nhật tự động vào: 22-05-2026 bởi Trợ Lý AI.*
