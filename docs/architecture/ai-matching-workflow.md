# Thiết kế chi tiết luồng so khớp AI

[English version](./ai-matching-workflow.en.md)

Đây là **thiết kế dự kiến**, chưa phải chức năng đã triển khai. Mục tiêu là tìm hồ sơ khách hàng có khả năng trùng **trong cùng một phiên**, đưa bằng chứng cho Steward xác minh, rồi mới hợp nhất và xuất CSV. AI/ML chấm điểm và đề xuất; Steward quyết định có gộp hay không. Các ngưỡng điểm, quy tắc blocking và cấu hình trường so sánh phải được hiệu chỉnh bằng dữ liệu mẫu trước khi chốt.

## Đầu vào, đầu ra và ranh giới phiên

- **Đầu vào:** Một hoặc nhiều file CSV đã được chấp nhận trong phiên, mỗi dòng có `source_records.id` nội bộ, `import_batch_id`, `row_number`, dữ liệu gốc và dữ liệu chuẩn hóa. ID khách hàng có sẵn trong CSV chỉ là thông tin tham khảo.
- **Đầu ra của AI:** Các cặp ứng viên trong `match_candidates` (điểm và bằng chứng) và nhóm nghi trùng trong `match_groups`/`group_members`. Đây là đề xuất, chưa phải hồ sơ đã gộp.
- **Đầu ra sau xác minh:** `review_decisions`, `master_records`, `master_links` và một CSV sạch hiện hành trong `clean_exports`.
- **Ranh giới bắt buộc:** Mọi truy vấn, cặp so sánh, nhóm, quyết định và hồ sơ đều được kiểm tra theo `session_id`. Các file khác nhau trong **cùng** phiên được so khớp với nhau; hai phiên khác nhau không được trộn.

## Các bước xử lý

| Bước | Cách thực hiện | Kết quả / điều kiện chuyển bước |
| --- | --- | --- |
| **1. Nhận và kiểm tra CSV** | `ImportService` chỉ nhận CSV, kiểm tra cột bắt buộc và đọc theo dòng. Ghi file vào phiên, lưu bản ghi gốc, dữ liệu đã chuẩn hóa và lỗi theo file/dòng/cột. Không dùng dòng lỗi để so khớp. | Mỗi file có số dòng hợp lệ/lỗi; phiên có ít nhất một file hợp lệ mới được bắt đầu. |
| **2. Chốt đầu vào** | Khi Steward bấm chạy, backend khóa danh sách `import_batch_id` thành `input_snapshot`, tạo `match_jobs` trạng thái `QUEUED` và chuyển việc cho worker. Worker nhận `session_id` và đọc đúng danh sách file trong snapshot, không đọc file nằm ngoài danh sách đó. | Job có dữ liệu đầu vào xác định; không thể thêm hoặc xóa file trong phiên đang chạy. |
| **3. Chuẩn hóa** | Giữ nguyên giá trị gốc và tạo các trường so sánh riêng: tên được chuẩn hóa Unicode/khoảng trắng và tách token; email được làm sạch; điện thoại được chuẩn hóa theo quy tắc quốc gia đã cấu hình; địa chỉ được chuẩn hóa khoảng trắng, viết tắt và thành phần. Không coi hai giá trị trống là bằng chứng trùng. | Dữ liệu so sánh nhất quán và còn truy ngược được về CSV gốc. Quy tắc chuẩn hóa được gắn phiên bản. |
| **4. Tạo cặp ứng viên (blocking)** | Tạo hợp của nhiều nhóm cặp trong **cùng phiên**, chẳng hạn cùng điện thoại hợp lệ, cùng email hợp lệ, hoặc tổ hợp token tên và thành phần địa chỉ. Loại cặp lặp và không so sánh một dòng với chính nó. Đếm cặp theo từng quy tắc trước khi chạy để tránh bùng nổ số cặp. | Tập cặp ứng viên đủ nhỏ để chấm điểm, kèm số cặp và mức giảm so với so sánh mọi cặp. |
| **5. Chấm điểm bằng Splink** | `ProbabilisticMatcher` so sánh các mức khớp của tên, điện thoại, email, địa chỉ; tính điểm/xác suất và phần đóng góp của từng trường. Dùng một cấu hình mô hình có phiên bản cho job. Mô hình được huấn luyện, hiệu chỉnh bằng dữ liệu gán nhãn hoặc quy trình ước lượng tham số riêng; không tự huấn luyện lại sau từng quyết định. | `match_candidates` lưu ID hai dòng, xác suất và bằng chứng; `match_jobs` lưu phiên bản mô hình và cấu hình ngưỡng. Ngưỡng giữ cặp để xem xét phải được kiểm chứng, chưa đặt giá trị cố định trong thiết kế. |
| **6. Gom nhóm và kiểm tra mâu thuẫn** | Nối các cặp vượt ngưỡng xem xét thành nhóm ứng viên. `GroupValidator` kiểm tra các liên kết bắc cầu yếu và mâu thuẫn rõ ràng (ví dụ cùng một nhóm nhưng thông tin định danh xung đột). Nhóm có mâu thuẫn được gắn cảnh báo để Steward xem từng thành viên; hệ thống không suy ra A trùng C chỉ vì A–B và B–C có điểm cao. | `match_groups`/`group_members` chỉ chứa nhóm đề xuất trong phiên và trạng thái `PENDING`. |
| **7. Trình bày bằng chứng** | P06 liệt kê nhóm, điểm và trạng thái. P07 đặt bản ghi gốc cạnh nhau, hiển thị trường khớp/khác, điểm từng cặp, cảnh báo mâu thuẫn và xuất xứ file. Steward chọn giá trị cùng nguồn cho Golden Record dự kiến. | Người duyệt có đủ thông tin để quyết định; không chỉ thấy một con số xác suất. |
| **8. Steward xác minh** | Steward duyệt hoặc từ chối từng nhóm `PENDING`. Backend kiểm tra quyền, `session_id`, phiên bản dữ liệu và khóa nhóm trước khi ghi `review_decisions`; yêu cầu đồng thời hoặc dữ liệu cũ trả `409`. Từ chối không tạo liên kết gộp. | Mỗi nhóm có một quyết định đang có hiệu lực và lưu người, thời gian, lý do, giá trị đã chọn. |
| **9. Hợp nhất có kiểm soát** | Với nhóm được duyệt, `GoldenRecordService` tạo/cập nhật master và `master_links` trong một giao dịch. Kiểm tra lại mọi bản ghi thuộc cùng phiên và mỗi bản ghi nguồn có tối đa một liên kết `ACTIVE`. Hồ sơ hợp lệ không trùng cũng được tạo master riêng. Lỗi giao dịch được ghi để thử lại an toàn. | Có Golden Record truy vết được về bản ghi gốc; không gộp tự động theo điểm AI. |
| **10. Xuất CSV sạch** | Chỉ khi mọi nhóm đã xử lý và các lần gộp hợp lệ, `CleanExportService` đọc master của đúng phiên, xuất một dòng cho mỗi khách hàng, kiểm tra số dòng/checksum và công bố file `READY`. CSV dùng UTF-8 và các cột đã nêu trong README. | Phiên chuyển `COMPLETED`; chỉ Steward tải được CSV hiện hành của phiên. |
| **11. Sửa gộp sai** | Khi Steward tách hồ sơ, backend gỡ liên kết sai và tính lại master từ dữ liệu gốc. CSV cũ ngừng tải, phiên sang `REVALIDATING`, sau đó tạo CSV mới và chỉ mở tải khi `READY`. | Bản ghi gốc, lịch sử quyết định và ranh giới phiên được giữ nguyên. |

## Chuẩn bị và cố định mô hình Splink

1. Từ dữ liệu mẫu, xác định trường so sánh và các mức khớp (chính xác, gần giống, thiếu dữ liệu) cho tên, điện thoại, email và địa chỉ. Dùng cùng quy tắc chuẩn hóa khi hiệu chỉnh và khi chạy job.
2. Ước lượng tham số trên tập dữ liệu huấn luyện riêng; Splink hỗ trợ lấy mẫu cặp ngẫu nhiên và ước lượng bằng EM với quy tắc blocking phù hợp. Kiểm tra trước số cặp mà mỗi quy tắc tạo ra để khống chế thời gian và bộ nhớ.
3. Dùng tập cặp đã gán nhãn **tách khỏi tập huấn luyện** để đo precision/recall và chọn ngưỡng đưa cặp vào danh sách cần Steward xem. Kiểm tra riêng các nhóm có liên kết bắc cầu và các trường hợp gộp nhầm.
4. Lưu cấu hình/mô hình đã chốt theo phiên bản. Mỗi `match_jobs` ghi `model_version`, `normalization_version` và `matching_config`; worker dùng đúng phiên bản đó trong suốt job. Quyết định của Steward có thể tạo dữ liệu gán nhãn cho một đợt hiệu chỉnh sau, nhưng không làm đổi mô hình của job đang chạy.

## Phân vai giữa AI, quy tắc và con người

| Thành phần | Việc thực hiện |
| --- | --- |
| **Splink/ML** | Ước lượng khả năng hai dòng thuộc cùng khách hàng; tạo điểm và bằng chứng theo trường. |
| **Quy tắc xử lý** | Kiểm tra CSV, chuẩn hóa, blocking, phát hiện mâu thuẫn, kiểm tra quyền và ranh giới phiên, ghi giao dịch, xuất CSV. |
| **Steward** | Xem bằng chứng, chọn dữ liệu cho Golden Record, duyệt hoặc từ chối gộp, tách hồ sơ gộp sai. |
| **LangGraph (tùy chọn)** | Điều phối trạng thái job và điểm dừng chờ Steward; có thể thay bằng hàng đợi và state machine. |
| **Embedding/LLM (tùy chọn)** | Bổ sung bằng chứng cho trường hợp khó trong giới hạn chi phí được cấu hình. Không tự ra quyết định gộp và không được gọi cho mọi cặp. |

## Cách kiểm chứng trước khi triển khai rộng

1. Chuẩn bị tập CSV mẫu có cặp trùng, không trùng, thiếu dữ liệu, lỗi gõ, dữ liệu mâu thuẫn và nhiều file trong cùng phiên. Gán nhãn một tập cặp để đo chất lượng.
2. Đo số cặp do từng quy tắc blocking tạo ra, độ bao phủ cặp trùng, thời gian và RAM/CPU tại 10k, 100k và 1m dòng. Không công bố năng lực chưa đo.
3. Đánh giá precision/recall của cặp và nhóm, đặc biệt là gộp nhầm. Điều chỉnh ngưỡng bằng dữ liệu gán nhãn; mọi ngưỡng và phiên bản mô hình phải lưu cùng job.
4. Kiểm thử hai phiên song song, file/dòng lỗi, yêu cầu duyệt đồng thời, job chạy lại, tách hồ sơ và tải CSV khi file cũ đã bị vô hiệu hóa.

**Ghi chú kỹ thuật:** Splink yêu cầu ID duy nhất cho mỗi dòng và hỗ trợ blocking, ước lượng tham số, dự đoán cặp và gom nhóm theo ngưỡng. Việc gom nhóm theo liên thông có thể tạo chuỗi bắc cầu, nên bước kiểm tra mâu thuẫn ở trên là quyết định thiết kế bổ sung của Unira. Xem [cấu hình Splink](https://github.com/moj-analytical-services/splink/blob/master/docs/api_docs/settings_dict_guide.md), [blocking khi huấn luyện](https://moj-analytical-services.github.io/splink/topic_guides/blocking/model_training.html), [dự đoán cặp](https://moj-analytical-services.github.io/splink/api_docs/inference.html) và [gom nhóm](https://moj-analytical-services.github.io/splink/api_docs/clustering.html).
