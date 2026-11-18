# paid to wait

Web app tĩnh tiếng Việt cho ArtX: một ca làm, ba đồng bọn và chiếc đồng hồ đếm tới tự do. HTML, CSS, JavaScript thuần; không cài dependency, không build, không backend hay secret. Nhân vật và các cảnh là SVG local dựng từ `assets/main.js`, `assets/work-scenes.js` và `assets/reactions.js`; không tải ảnh hoặc font bên ngoài.

## Mục đích

**paid to wait** dành cho dân văn phòng muốn biết chính xác còn bao lâu nữa được tan làm. Chọn giờ check-in, chọn đồng bọn Pepe, capybara hoặc mèo cam, rồi cùng đếm ngược đến khoảnh khắc đóng máy và về nhà.

App tái hiện một ngày công sở bằng những hoạt cảnh: tập trung gõ phím giữa cơn mưa đô la, nhận thêm ticket Jira rồi muốn hét lên, chờ ly trà sữa cứu lấy tinh thần, tụm lại tám chuyện nhưng giải tán ngay khi sếp xuất hiện, hay tranh thủ đi “giải phóng bộ nhớ đệm”. Nghỉ trưa thì vừa ăn vừa xem máy tính, sắp hết giờ nghỉ lại tiếc nuối, còn gần giờ về thì tâm hồn đã ở ngoài cửa. Một chút đồng cảm và tiếng cười cho những người vẫn chăm chỉ làm việc, nhưng cũng rất chăm chỉ chờ tan ca.

## Chạy local

Chạy trong thư mục chứa `index.html`:

```sh
python -m http.server 8000
```

Mở `http://localhost:8000` để truy cập.
