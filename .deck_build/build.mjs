import pptxgen from 'pptxgenjs';
import { mkdir } from 'node:fs/promises';

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Unira';
pptx.subject = 'Ý tưởng sản phẩm Unira';
pptx.title = 'Unira | Pitch deck';
pptx.lang = 'vi-VN';
pptx.theme = {
  headFontFace: 'Segoe UI', bodyFontFace: 'Segoe UI', lang: 'vi-VN',
};

const C = {
  bg: 'F8F8F5', ink: '112B34', teal: '0A7D7C', light: 'DCEBE7',
  muted: '5C6B71', rule: 'CFD8D7', coral: 'C65A3A', white: 'FFFFFF',
  dark: '08262D', sage: 'EDF4F0', gray: 'E8ECEA',
};
const SW = 13.333, SH = 7.5, FONT = 'Segoe UI';

function t(slide, text, x, y, w, h, size, color=C.ink, bold=false, extra={}) {
  slide.addText(text, {
    x,y,w,h, fontFace:FONT, fontSize:size, color, bold, margin:0,
    breakLine:false, valign:'mid', fit:'shrink',
    ...extra,
  });
}
function line(slide,x1,y1,x2,y2,color=C.rule,width=1) {
  slide.addShape(pptx.ShapeType.line,{x:x1,y:y1,w:x2-x1,h:y2-y1,line:{color,width}});
}
function rect(slide,x,y,w,h,fill,stroke=fill,radius=false) {
  slide.addShape(radius?pptx.ShapeType.roundRect:pptx.ShapeType.rect,{
    x,y,w,h,rectRadius:radius?0.12:0,
    fill:{color:fill},line:{color:stroke,width:stroke===fill?0:1},
  });
}
function base(title,num,kicker='') {
  const s=pptx.addSlide();
  s.background={color:C.bg};
  if(kicker) t(s,kicker.toUpperCase(),0.78,0.36,8.8,0.25,10,C.teal,true,{charSpacing:1.5});
  t(s,title,0.78,0.72,11.75,0.89,30,C.ink,true,{breakLine:false});
  line(s,0.78,1.73,12.54,1.73,C.rule,1.1);
  line(s,0.78,7.08,12.54,7.08,C.rule,0.7);
  t(s,'UNIRA',0.78,7.15,2.3,0.18,9,C.teal,true,{charSpacing:1.3});
  t(s,String(num).padStart(2,'0'),12.12,7.13,0.42,0.2,9,C.muted,false,{align:'right'});
  return s;
}
function note(slide,text) { slide.addNotes(text); }

// 1: Cover
{
  const s=pptx.addSlide(); s.background={color:C.dark};
  t(s,'UNIRA',0.82,0.63,6.0,0.58,24,'8BD4CC',true,{charSpacing:3.3});
  line(s,0.82,1.45,12.55,1.45,'47727A',1);
  t(s,'Dữ liệu khách hàng\nđáng tin hơn,\ntừ những bản ghi rời rạc.',0.82,1.82,10.8,3.2,44,C.white,true,{breakLine:false,valign:'top',lineSpacingMultiple:1.05});
  t(s,'Unira tìm những bản ghi có thể trùng nhau, đưa bằng chứng cho người phụ trách duyệt và xuất dữ liệu đã được kiểm tra.',0.85,5.58,10.75,0.88,20,'D2E3E2',false,{valign:'top'});
  t(s,'ĐỀ XUẤT SẢN PHẨM',0.85,6.92,5,0.22,10,'8BD4CC',true,{charSpacing:1.5});
  note(s,'Nguồn nội dung: README.md và docs/requirements/README.md của dự án Unira. Đây là ý tưởng sản phẩm, chưa phải kết quả triển khai.');
}

// 2: Concrete problem
{
  const s=base('Một khách hàng có thể xuất hiện dưới nhiều cách ghi',2,'Vấn đề');
  t(s,'Ví dụ minh họa',0.8,1.96,4,0.33,12,C.muted,false);
  const xs=[0.8,2.45,5.85,8.4], widths=[1.5,3.15,2.3,4.05];
  const headers=['NGUỒN','HỌ TÊN','ĐIỆN THOẠI','ĐỊA CHỈ'];
  headers.forEach((h,i)=>t(s,h,xs[i],2.5,widths[i],0.3,11,C.teal,true,{charSpacing:0.7}));
  line(s,0.8,2.9,12.5,2.9,C.ink,1.25);
  const rows=[
    ['CRM','Trần Hà Linh','0912 345 678','12 Duy Tân, Hà Nội'],
    ['ERP','Tran Ha Linh','0912345678','12 Duy Tan, Ha Noi'],
    ['Bán hàng','T. Hà Linh','+84 912 345 678','Số 12, đường Duy Tân'],
  ];
  rows.forEach((r,j)=>{
    const y=3.1+j*0.86;
    r.forEach((v,i)=>t(s,v,xs[i],y,widths[i],0.49,i===0?14:16,i===0?C.teal:C.ink,i===0));
    line(s,0.8,y+0.66,12.5,y+0.66,C.rule,0.7);
  });
  t(s,'Nếu chỉ đếm số dòng, doanh nghiệp sẽ tưởng đây là ba khách hàng.',0.8,6.14,11.7,0.6,23,C.ink,true);
  note(s,'Ba dòng dữ liệu là ví dụ giả định để giải thích vấn đề; không phải dữ liệu thật của khách hàng.');
}

// 3: Business pain
{
  const s=base('Dữ liệu trùng làm sai cả vận hành lẫn báo cáo',3,'Hệ quả');
  const items=[
    ['01','Báo cáo đếm dư','Số khách hàng và mức độ tiếp cận có thể bị thổi lên vì cùng một người nằm ở nhiều dòng.'],
    ['02','Chăm sóc lặp','Các nhóm làm việc có thể liên hệ nhiều lần mà không biết đang nói chuyện với cùng một người.'],
    ['03','Rà soát mất thời gian','Nhân viên phải tự so sánh tên, số điện thoại và địa chỉ trước khi dám gộp dữ liệu.'],
  ];
  items.forEach((it,i)=>{
    const y=2.04+i*1.47;
    t(s,it[0],0.82,y,0.8,0.43,18,C.teal,true);
    t(s,it[1],1.76,y-0.03,3.1,0.53,22,C.ink,true);
    t(s,it[2],5.05,y-0.02,7.2,0.78,18,C.muted,false,{valign:'top'});
    if(i<2) line(s,0.82,y+1.1,12.48,y+1.1,C.rule,0.8);
  });
  note(s,'Các hệ quả được suy ra từ bài toán trùng dữ liệu được mô tả trong README.md. Deck không nêu con số tác động vì Unira chưa có số đo thực tế.');
}

// 4: Solution
{
  const s=base('Unira gợi ý; người phụ trách quyết định',4,'Giải pháp');
  t(s,'Hệ thống nhận file CSV/XLSX, phát hiện những bản ghi có khả năng trùng và cho thấy lý do. Steward xem từng nhóm trước khi duyệt hợp nhất.',0.8,2.02,11.6,1.0,23,C.ink,false,{valign:'top'});
  const blocks=[
    ['01','Nhận dữ liệu','Nhiều file trong một phiên'],
    ['02','Tìm nghi trùng','Có điểm khớp và bằng chứng'],
    ['03','Duyệt kết quả','Steward chọn hoặc từ chối gộp'],
    ['04','Xuất dữ liệu','CSV sạch của đúng phiên'],
  ];
  blocks.forEach((b,i)=>{
    const x=0.8+i*3.05;
    line(s,x,3.82,x+2.55,3.82,i===2?C.coral:C.teal,4);
    t(s,b[0],x,4.12,0.7,0.48,24,i===2?C.coral:C.teal,true);
    t(s,b[1],x,4.69,2.66,0.46,20,C.ink,true);
    t(s,b[2],x,5.32,2.65,0.95,16,C.muted,false,{valign:'top'});
  });
  note(s,'Nguồn: README.md, phần luồng xử lý; docs/requirements/README.md, BR02, BR08, BR12–BR16.');
}

// 5: Evidence and review
{
  const s=base('Người duyệt nhìn thấy vì sao hệ thống nghi trùng',5,'Trải nghiệm sản phẩm');
  t(s,'Cặp bản ghi minh họa',0.82,1.98,4.0,0.3,12,C.muted,false);
  const data=[
    ['BẢN GHI A','Trần Hà Linh','0912 345 678','12 Duy Tân'],
    ['BẢN GHI B','Tran Ha Linh','+84 912 345 678','12 Duy Tan'],
  ];
  data.forEach((row,i)=>{
    const x=0.82+i*6.05;
    t(s,row[0],x,2.5,5.2,0.28,12,C.teal,true,{charSpacing:0.7});
    line(s,x,2.85,x+5.5,2.85,C.teal,1.1);
    t(s,row[1],x,3.06,5.3,0.54,24,C.ink,true);
    t(s,row[2],x,3.8,5.3,0.38,18,C.ink);
    t(s,row[3],x,4.35,5.3,0.38,18,C.ink);
  });
  line(s,0.82,5.12,12.5,5.12,C.rule,0.8);
  t(s,'Điện thoại trùng sau chuẩn hóa; tên và địa chỉ khác cách ghi.',0.82,5.35,11.7,0.52,20,C.ink,true);
  t(s,'Steward xem nguồn dữ liệu, chọn giá trị sẽ giữ và ghi nhận quyết định.',0.82,6.02,11.65,0.56,18,C.muted);
  note(s,'Ví dụ giả định. Nguồn tính năng: README.md, màn hình P07; docs/requirements/README.md, US05–US08.');
}

// 6: Sessions
{
  const s=base('Mỗi đợt xử lý có dữ liệu và kết quả riêng',6,'Điểm khác biệt');
  t(s,'Một phiên có thể nhận nhiều file. Khi chuyển sang phiên khác, danh sách nghi trùng, quyết định duyệt và CSV đều đổi theo.',0.82,2.0,11.55,0.8,21,C.ink,false,{valign:'top'});
  const a=[['PHIÊN A','File từ CRM','File từ ERP','CSV của phiên A'],['PHIÊN B','File tháng sau','File bổ sung','CSV của phiên B']];
  a.forEach((r,i)=>{
    const y=3.18+i*1.45;
    t(s,r[0],0.82,y,1.5,0.41,19,i?C.coral:C.teal,true);
    line(s,2.4,y+0.2,3.0,y+0.2,C.rule,1.3);
    t(s,r[1],3.22,y,2.15,0.42,17,C.ink);
    t(s,r[2],5.55,y,2.15,0.42,17,C.ink);
    line(s,7.92,y+0.2,8.55,y+0.2,C.rule,1.3);
    t(s,r[3],8.8,y,3.4,0.42,18,C.ink,true);
    line(s,0.82,y+0.8,12.5,y+0.8,C.rule,0.8);
  });
  t(s,'Unira không trộn hồ sơ giữa các phiên chỉ vì chúng có vẻ giống nhau.',0.82,6.31,11.4,0.42,18,C.muted);
  note(s,'Nguồn: README.md, mô tả phiên xử lý; docs/requirements/README.md, BR01, BR03, BR13, BR16. Tên file và phiên trong slide là ví dụ minh họa.');
}

// 7: Control
{
  const s=base('Mọi quyết định gộp đều có thể kiểm tra lại',7,'Kiểm soát');
  const items=[
    ['Bản ghi gốc vẫn còn','Có thể đối chiếu lại thông tin ban đầu sau khi hợp nhất.'],
    ['Nguồn của từng trường rõ ràng','Người duyệt biết giá trị được lấy từ file nào.'],
    ['Gộp nhầm có thể sửa','Steward tách hồ sơ; CSV cũ ngừng tải cho đến khi tạo bản mới.'],
  ];
  items.forEach((r,i)=>{
    const y=2.07+i*1.47;
    line(s,0.82,y,0.82,y+0.92,i===2?C.coral:C.teal,4);
    t(s,r[0],1.17,y-0.04,4.62,0.58,22,C.ink,true);
    t(s,r[1],6.05,y-0.02,6.2,0.84,18,C.muted,false,{valign:'top'});
    if(i<2) line(s,1.17,y+1.14,12.48,y+1.14,C.rule,0.8);
  });
  note(s,'Nguồn: README.md; docs/requirements/README.md, BR07–BR15.');
}

// 8: Outcomes
{
  const s=base('Kết quả của một phiên xử lý',8,'Giá trị');
  t(s,'Sau khi mọi nhóm cần xem xét đã được xử lý, Unira xuất CSV sạch của phiên. Bản ghi lỗi được tách ra để kiểm tra, còn mỗi khách hàng đã xác minh xuất hiện một lần trong file.',0.82,2.02,11.62,1.07,21,C.ink,false,{valign:'top'});
  const r=[
    ['Đối chiếu','Danh sách nhóm nghi trùng cùng dấu hiệu và nguồn dữ liệu.'],
    ['Tra cứu','Thông tin khách hàng đã hợp nhất, vẫn truy được bản ghi gốc.'],
    ['Sử dụng','CSV UTF-8 thuộc đúng phiên, có số dòng và thời điểm xuất.'],
  ];
  r.forEach((v,i)=>{
    const x=0.82+i*4.1;
    t(s,String(i+1).padStart(2,'0'),x,3.64,0.85,0.42,23,C.teal,true);
    line(s,x,4.16,x+3.5,4.16,C.teal,1.4);
    t(s,v[0],x,4.42,3.6,0.48,22,C.ink,true);
    t(s,v[1],x,5.06,3.54,1.07,17,C.muted,false,{valign:'top'});
  });
  note(s,'Nguồn: docs/requirements/README.md, BR12–BR15, AC10–AC13. Lợi ích được mô tả theo thiết kế sản phẩm, chưa phải kết quả vận hành đo được.');
}

// 9: Pilot plan
{
  const s=base('Một đợt thử nghiệm sẽ cho biết Unira làm tốt đến đâu',9,'Kiểm chứng');
  t(s,'Đợt thử nghiệm nên bắt đầu bằng dữ liệu mẫu có đáp án đối chiếu. Cần đánh giá kết quả trước khi nói đến khả năng xử lý ở quy mô lớn.',0.82,2.02,11.45,0.92,21,C.ink,false,{valign:'top'});
  const rows=[
    ['Độ chính xác','Trong các cặp được gợi ý, bao nhiêu cặp thực sự trùng?'],
    ['Độ bao phủ','Hệ thống tìm được bao nhiêu cặp trùng đã biết?'],
    ['Tốc độ và tài nguyên','Đo thời gian, RAM và CPU ở 10.000, 100.000 và 1 triệu bản ghi.'],
  ];
  rows.forEach((r,i)=>{
    const y=3.43+i*0.86;
    t(s,r[0],0.82,y,3.65,0.46,18,C.teal,true);
    t(s,r[1],4.58,y,7.74,0.52,18,C.ink);
    line(s,0.82,y+0.7,12.5,y+0.7,C.rule,0.7);
  });
  t(s,'Các chỉ số trên là kế hoạch đo. Unira chưa công bố kết quả benchmark.',0.82,6.44,11.6,0.34,15,C.muted,false,{italic:true});
  note(s,'Nguồn: docs/requirements/README.md, BR18 và AC17. 10k, 100k và 1m là các mốc dự kiến kiểm thử, không phải năng lực đã chứng minh.');
}

// 10: CTA
{
  const s=pptx.addSlide(); s.background={color:C.dark};
  t(s,'UNIRA',0.82,0.63,6.0,0.58,24,'8BD4CC',true,{charSpacing:3.3});
  line(s,0.82,1.45,12.55,1.45,'47727A',1);
  t(s,'Bắt đầu bằng một\nphiên thử nghiệm.',0.82,1.88,11.45,2.05,48,C.white,true,{valign:'top'});
  t(s,'Chọn một tập CSV/XLSX, xác định người duyệt và so kết quả của Unira với dữ liệu đã được kiểm tra thủ công.',0.86,4.66,10.85,1.02,22,'D2E3E2',false,{valign:'top'});
  line(s,0.82,6.51,12.55,6.51,'47727A',1);
  t(s,'Unira hiện là đề xuất sản phẩm. Buổi thử nghiệm sẽ là cơ sở để quyết định bước phát triển tiếp theo.',0.86,6.68,11.63,0.47,14,'8BD4CC');
  note(s,'Lời mời thử nghiệm, không hàm ý sản phẩm đã được triển khai hoặc có số liệu benchmark.');
}

await mkdir('output/presentations',{recursive:true});
await pptx.writeFile({fileName:'output/presentations/Unira_Pitch_Deck.pptx'});
console.log('Wrote 10 slides');
