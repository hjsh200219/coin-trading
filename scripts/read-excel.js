const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../sample/NVDL매매점_Min_Max.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('시트 목록:', workbook.SheetNames);
console.log('\n');

// 각 시트의 첫 20행 정도만 확인
workbook.SheetNames.forEach(sheetName => {
  console.log(`\n========== ${sheetName} ==========`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });
  
  // 첫 30행만 출력
  const rowsToShow = Math.min(30, data.length);
  for (let i = 0; i < rowsToShow; i++) {
    console.log(`Row ${i + 1}:`, data[i]);
  }
  
  console.log(`\n총 ${data.length}행`);
});


