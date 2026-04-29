const tocText = `
Basic rules to create order constellating in a family system. ......................... 9 
Basic rules to create order constellating in organizations. .......................... 23 
Basic rules to create order constellating with symbols. ................................ 23 
`.trim()

const lines = tocText.split('\n')
for (let line of lines) {
    console.log(`Line: [${line}]`)
    const match = line.trim().match(/^(.*?)\.{2,}\s*(\d+)$/)
    if (match) {
        console.log(`Match! Title: ${match[1]}, Page: ${match[2]}`)
    } else {
        console.log('No match')
    }
}
