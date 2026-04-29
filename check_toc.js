const fs = require('fs')
const path = require('path')

async function main() {
  const pdfParsePath = path.join(__dirname, 'app', 'node_modules', 'pdf-parse')
  const pdfParse = require(pdfParsePath)
  const pdfPath = path.join(__dirname, 'app', 'public', 'Systemic_Constellations.pdf')
  
  const buffer = fs.readFileSync(pdfPath)
  const options = {
    // Only parse pages 5-7 (the INDEX)
    max: 7
  }
  const data = await pdfParse(buffer, options)
  
  // pdf-parse doesn't easily allow extracting specific pages without parsing everything up to 'max'
  // But we can check the text. 
  console.log(data.text)
}

main().catch(console.error)
