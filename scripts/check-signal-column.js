const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../sample/NVDL매매점_Min_Max.xlsx');
const workbook = XLSX.readFile(filePath, { cellFormula: true });

const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

console.log('===== F열 확인 =====');
console.log('F1:', sheet['F1']);
console.log('F2:', sheet['F2']);
console.log('F3:', sheet['F3']);

console.log('\n===== Row 1200-1210 (F, G열) =====');
for (let i = 1200; i <= 1210; i++) {
  console.log(`Row ${i}:`);
  console.log('  D' + i + ':', sheet['D' + i]?.v); // ranking value
  console.log('  F' + i + ':', sheet['F' + i]); // 매수/매도 시그널
  console.log('  G' + i + ':', sheet['G' + i]); // 매매포지션 
  console.log('');
}


