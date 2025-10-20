const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../sample/NVDL매매점_Min_Max.xlsx');
const workbook = XLSX.readFile(filePath, { cellFormula: true, cellStyles: true });

const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

console.log('===== Row 1200-1210의 H, I열 수식 확인 =====\n');
for (let i = 1200; i <= 1210; i++) {
  console.log(`Row ${i}:`);
  console.log('  H' + i + ':', sheet['H' + i]); // 매수점
  console.log('  I' + i + ':', sheet['I' + i]); // 매도점
  console.log('');
}

console.log('\n===== E열도 확인 =====\n');
for (let i = 1200; i <= 1205; i++) {
  console.log(`Row ${i}:`);
  console.log('  E' + i + ':', sheet['E' + i]); 
  console.log('');
}


