/**
 * Script kiểm tra kết quả chấm bài qua API (Hỗ trợ Wrapper)
 */
const API_URL = process.env.API_URL || 'http://localhost:3000';
const USER_ID = 'e729209b-400f-4b3a-bb3c-81ca4787df00';

async function check() {
  console.log(`🔍 Truy vấn kết quả cho User: ${USER_ID} tại: ${API_URL}`);

  try {
    const res = await fetch(`${API_URL}/submissions?userId=${USER_ID}`);
    if (!res.ok) throw new Error(`API trả về lỗi: ${res.status}`);

    const json = await res.json();
    // Truy cập vào json.result nếu có, nếu không thì coi json là mảng
    const list = json.result || json;

    if (!Array.isArray(list) || list.length === 0) {
      console.log('❌ Không tìm thấy submission nào cho user này.');
      return;
    }

    const latest = list[0];
    console.log(`✅ Submission mới nhất: ${latest.id}`);

    // Lấy chi tiết (API chi tiết cũng bọc trong .result)
    const detailRes = await fetch(`${API_URL}/submissions/${latest.id}`);
    const detailJson = await detailRes.json();
    const submission = detailJson.result || detailJson;

    console.log('\n--------------------------------------------------');
    console.log(`📊 TRẠNG THÁI: ${submission.status}`);
    console.log(`🎯 ĐIỂM SỐ: ${submission.score || 0}%`);
    console.log(`🕒 THỜI GIAN: ${submission.runtimeMs || 0}ms`);
    console.log(`💾 BỘ NHỚ: ${submission.memoryMb || 0}MB`);
    console.log('\n📝 LOG CHI TIẾT:');
    console.log(submission.logs || ' Không có log.');
    console.log('--------------------------------------------------\n');

  } catch (error) {
    console.error('❌ Lỗi thực thi:', error.message);
  }
}

check();
