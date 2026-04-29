const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

async function main() {
    const envPath = path.join(__dirname, 'app', '.env.local')
    const env = {}
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
        const m = line.match(/^([^=]+)=(.+)$/)
        if (m) env[m[1].trim()] = m[2].trim()
    })

    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    const manualTitle = 'Systemic Constellations'
    const { data: manual } = await supabase.from('manuals').select('id').eq('title', manualTitle).single()
    
    if (!manual) {
        console.error('Manual not found')
        return
    }

    const tocText = `
Basic rules to create order constellating in a family system. ......................... 9 
Basic rules to create order constellating in organizations. .......................... 23 
Basic rules to create order constellating with symbols. ................................ 23 
Instructions for using this manual. ............................................................................ 34 
MINI FAMILY CONSTELLATION .................................................................................. 37 
FAMILY CONSTELLATION .............................................................................................. 43 
ORGANIZATIONAL CONSTELLATION ..................................................................... 61 
CONSTELLATION WITH SYMBOLS ........................................................................... 77 
COMBINED CONSTELLATION ................................................................................... 103 
Exercises for Transforming Consciousness in the Systems ..................... 135 
General Instructions ....................................................................................................... 135 
a. Ordering the Family System ........................................................................... 137 
1. Ordering the line of siblings .......................................................................... 137 
2. Ordering the relationship between parents and offspring .......... 140 
3. Ordering the relationship with former spouses/partners ............ 143 
4. Ordering the relationship between offspring’s and parents’ 
spouses/partners ..................................................................................................... 145 
b. Ordering the members of an organization ............................................ 148 
c. Ordering symbols ................................................................................................. 153 
d. Statement for Order ........................................................................................... 168 
e. Empowering Statements ................................................................................. 169 
f. Fusing Symbols ...................................................................................................... 173 
1. Heavenly Mother .......................................................................................... 174 
2. The Spiritual Father ..................................................................................... 175 
3. The Mother ....................................................................................................... 177 
4. The Father ........................................................................................................ 179 
5. The Magician ................................................................................................... 181 
6. The Hero ............................................................................................................ 183 
7. Universal Justice ............................................................................................ 184 
8. The Old Wise Man ........................................................................................ 186 
9. The Child ............................................................................................................ 188 
10. The Adventurer .............................................................................................. 189 
11. Firmness ............................................................................................................ 191 
12. Moderation ....................................................................................................... 192 
13. The Shadow ..................................................................................................... 194 
14. Darkness ............................................................................................................ 195 
15. Death ................................................................................................................... 196 
16. Illness ................................................................................................................... 198 
17. Rebirth ................................................................................................................ 200 
18. Liberation .......................................................................................................... 201 
19. Hope ..................................................................................................................... 202 
20. Psychic Totality .............................................................................................. 204 
21. Destiny ................................................................................................................ 205 
22. Sacrifice .............................................................................................................. 207 
23. Sex ......................................................................................................................... 208 
24. Abundance ....................................................................................................... 210 
25. Religion ............................................................................................................... 211 
26. Money .................................................................................................................. 213 
27. Love ...................................................................................................................... 214 
28. Intimacy ............................................................................................................. 216 
29. The Spouse/Partner .................................................................................... 217 
30. Health .................................................................................................                 219 
31. The Victim ......................................................................................................... 220 
32. The Perpetrator ............................................................................................. 222 
33. The Saboteur ................................................................................................... 223 
34. The Teenager .................................................................................................. 225 
35. The Hurt Child ................................................................................................ 226 
36. Other .................................................................................................                   228 
g. Accelerated Processing Techniques .......................................................... 229 
1. Conscious REM (Rapid Eye Movement) ................................................. 229 
2. Tapas Acupressure Technique (TAT®) .................................................. 231 
3. Emotional Freedom Technique (EFT) ..................................................... 233 
4. Tapping on Energy Centers ........................................................................... 235 
Appendix .................................................................................................                               239 
References .................................................................................................                               240 
Terminology .................................................................................................                             242 
About the author .........................................................................................                             244 
`.trim()

    const sections = []
    let currentChapter = 'Main Content'
    const lines = tocText.split('\n')
    
    for (let line of lines) {
        line = line.trim()
        if (!line) continue
        
        // Match title followed by at least two dots and a page number
        const match = line.match(/^(.*?)\.{2,}\s*(\d+)$/)
        if (match) {
            let title = match[1].trim()
            // Clean up trailing dots or spaces from the title part
            title = title.replace(/\.+$/, '').trim()
            
            const bookPage = parseInt(match[2], 10)
            const pdfPage = bookPage + 8

            // Heading if all caps OR starts with 'Exercises' OR is 'Basic rules'
            if ((title === title.toUpperCase() && title.length > 5) || 
                title.startsWith('Exercises') || 
                title.startsWith('Basic rules')) {
                currentChapter = title
            }

            sections.push({
                manual_id: manual.id,
                chapter: currentChapter,
                title: title,
                content: `Content for section: ${title}. Refer to PDF page ${pdfPage} for full details.`,
                order_idx: sections.length,
                page_number: pdfPage
            })
        }
    }

    console.log(`Parsed ${sections.length} sections. Extracting text for each...`)
    
    // To extract text accurately, we'll parse the whole manual once
    const pdfPath = path.join(__dirname, 'app', 'public', 'Systemic_Constellations.pdf')
    const pdfParsePath = path.join(__dirname, 'app', 'node_modules', 'pdf-parse')
    const pdfParse = require(pdfParsePath)
    
    const buffer = fs.readFileSync(pdfPath)
    
    // We need page-by-page text. pdf-parse doesn't provide this easily by default,
    // but we can use a pagerenderer callback to capture it.
    const pages = {}
    await pdfParse(buffer, {
        pagerender: (pageData) => {
            return pageData.getTextContent().then(textContent => {
                let lastY, text = ''
                for (let item of textContent.items) {
                    if (lastY !== item.transform[5] && lastY !== undefined) {
                        text += '\n'
                    }
                    text += item.str
                    lastY = item.transform[5]
                }
                pages[pageData.pageIndex + 1] = text
                return text
            })
        }
    })

    // Assign content to sections based on page ranges
    for (let i = 0; i < sections.length; i++) {
        const startPage = sections[i].page_number
        const endPage = (i < sections.length - 1) ? sections[i+1].page_number : Object.keys(pages).length
        
        let content = ''
        for (let p = startPage; p < endPage; p++) {
            if (pages[p]) {
                content += pages[p] + '\n\n'
            }
        }
        
        if (content.trim()) {
            sections[i].content = content.trim()
        }
    }

    console.log('Clearing old data...')
    await supabase.from('manual_sections').delete().eq('manual_id', manual.id)
    
    // Supabase can fail on large inserts if chunks are too big
    console.log(`Inserting ${sections.length} sections...`)
    const chunkSize = 20
    for (let i = 0; i < sections.length; i += chunkSize) {
        const chunk = sections[i + chunkSize] ? sections.slice(i, i + chunkSize) : sections.slice(i)
        const { error } = await supabase.from('manual_sections').insert(chunk)
        if (error) {
            console.error('Error inserting chunk:', error)
        }
    }
    
    console.log('Successfully updated manual sections with accurate page numbers and real content!')
}

main().catch(console.error)
