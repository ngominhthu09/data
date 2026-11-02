# Quy trình kỹ thuật

[English version](./processing-workflow.en.md)

1. **Tạo phiên:** Steward đặt tên và có thể thêm mô tả. Hệ thống cấp `session_id` cho phiên mới. Một tài khoản có thể tạo nhiều phiên, mỗi phiên có trạng thái riêng.
2. **Tải file lên:** Steward thêm một hoặc nhiều file CSV khi phiên còn ở trạng thái `DRAFT` hoặc `READY`. Hệ thống từ chối file không phải CSV. Mỗi file có `import_batch_id` và `session_id`; hệ thống lưu dung lượng, nhãn nguồn và báo lỗi theo từng file.
3. **Chốt đầu vào:** Khi Steward bắt đầu xử lý, hệ thống lưu snapshot danh sách file và cấu hình so khớp. Sau đó không thể thêm file vào phiên.
4. **So khớp:** Worker chỉ đọc dữ liệu của phiên đó, chuẩn hóa và dùng nhiều cách blocking để tạo cặp ứng viên. Splink chấm điểm các cặp; worker kiểm tra mâu thuẫn trong từng nhóm.
5. **Duyệt kết quả:** Steward xem các nhóm nghi trùng, chọn thông tin cho Golden Record rồi phê duyệt hoặc từ chối. Nhóm đã xử lý không được duyệt lại; quyết định cũng không được dựa trên dữ liệu đã cũ.
6. **Hợp nhất:** Worker tạo hoặc cập nhật master và liên kết nguồn trong cùng `session_id`. Mỗi bản ghi nguồn có tối đa một liên kết master đang hoạt động; hồ sơ hợp lệ không trùng được tạo master riêng.
7. **Xuất CSV sạch:** Khi mọi nhóm đã được xử lý và kết quả hợp nhất đã được kiểm tra, hệ thống xuất CSV từ các master của phiên, kiểm tra số dòng và checksum. Phiên chỉ chuyển sang `COMPLETED` khi CSV ở trạng thái `READY`.
8. **Xử lý song song:** Steward có thể tạo phiên B khi phiên A còn chạy hoặc chờ duyệt. Kết quả, quyết định và CSV của hai phiên tách biệt; hàng đợi giới hạn số job chạy cùng lúc để tránh quá tải.
9. **Sau khi tách hồ sơ:** Hệ thống ngừng cho tải CSV cũ, kiểm tra lại Golden Record và tạo CSV hiện hành mới. Chỉ mở lại chức năng tải khi file mới ở trạng thái `READY`.

Xem [thiết kế luồng so khớp AI](./ai-matching-workflow.md) để biết cách thực hiện và kiểm chứng từng bước.

