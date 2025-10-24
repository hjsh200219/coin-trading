const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../sample/NVDL매매점_Min_Max.xlsx');
const workbook = XLSX.readFile(filePath, { cellFormula: true });

const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

console.log('===== 헤더 및 설정 값 =====');
console.log('A1:', sheet['A1']);
console.log('B1:', sheet['B1']);
console.log('D1:', sheet['D1']);
console.log('G1:', sheet['G1']);
console.log('H1:', sheet['H1']);
console.log('I1:', sheet['I1']);
console.log('J1:', sheet['J1']);

console.log('\n===== Row 2 (매수/매도 비교 범위 개수) =====');
console.log('H2:', sheet['H2']);
console.log('I2:', sheet['I2']);

console.log('\n===== Row 3 (매수/매도 임계값) =====');
console.log('H3:', sheet['H3']);
console.log('I3:', sheet['I3']);

console.log('\n===== 데이터 행 샘플 (Row 4-10) =====');
for (let i = 4; i <= 10; i++) {
  console.log(`\nRow ${i}:`);
  console.log('  A' + i + ':', sheet['A' + i]); // tick time
  console.log('  B' + i + ':', sheet['B' + i]); // close
  console.log('  D' + i + ':', sheet['D' + i]); // ranking value
  console.log('  G' + i + ':', sheet['G' + i]); // 매매포지션
  console.log('  H' + i + ':', sheet['H' + i]); // 매수점
  console.log('  I' + i + ':', sheet['I' + i]); // 매도점
  console.log('  J' + i + ':', sheet['J' + i]); // 수익
}

console.log('\n===== 특정 행 수식 확인 (Row 1200 근처) =====');
for (let i = 1200; i <= 1205; i++) {
  console.log(`\nRow ${i}:`);
  console.log('  D' + i + ':', sheet['D' + i]); // ranking value
  console.log('  G' + i + ':', sheet['G' + i]); // 매매포지션
}


