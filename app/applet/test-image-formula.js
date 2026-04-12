const ExcelJS = require('exceljs');
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Sheet1');
ws.getCell('A1').value = { formula: 'IMAGE("https://example.com/img.png")' };
console.log(ws.getCell('A1').value);
