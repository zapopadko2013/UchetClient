import React, { useMemo } from "react";
import { marked, type Token } from "marked";
import { useTranslation } from 'react-i18next';
import styles from "./News.module.css"; 

// --- ПРОПСЫ ---
interface MarkedProps {
  markedText: string;
  onMarkedChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

// --- ПЛАГИН ДЛЯ MARKED v4 (Без изменений) ---
marked.use({
  renderer: {
    image(token: any) {
      const src = token.src || token.href;
      const title = token.title;
      const alt = token.text || "";

      let size = "";
      if (title) {
        const sizeParts = title.split("x");
        if (sizeParts.length > 1) {
          size = `width="${sizeParts[0]}" height="${sizeParts[1]}"`;
        } else {
          size = `width="${sizeParts[0]}"`;
        }
      }

      return `<img src="${src}" alt="${alt}" ${size} />`;
    }
  }
});


// Настройки Marked (Без изменений)
marked.setOptions({
  breaks: true
});


// --- КОМПОНЕНТ ---
export default function MarkedDownEditor({ markedText, onMarkedChange }: MarkedProps) {
  const { t } = useTranslation();

  // --- ЛОКАЛИЗАЦИЯ ТЕКСТА-ЗАГЛУШКИ (Без изменений) ---
  const defaultPlaceholder = useMemo(() => {
    // ... (весь демонстрационный текст, использующий t())
    return `
# ${t('adminnews.editor.welcome')}

## ${t('adminnews.editor.subtitle')}
### ${t('adminnews.editor.coolStuff')}
  
${t('adminnews.editor.inlineCode')}: \`<div></div>\`, 
  
\`\`\`javascript
// ${t('adminnews.editor.multilineCode')}:
  
function anotherExample(firstLine, lastLine) {
  if (firstLine == '\`\`\`' && lastLine == '\`\`\`') {
    return multilineCode;
  }
}
\`\`\`
  
${t('adminnews.editor.boldText')} **${t('adminnews.editor.bold')}**!
${t('adminnews.editor.italicText')} _${t('adminnews.editor.italic')}_.
${t('adminnews.editor.combinedText')} **_${t('adminnews.editor.combined')}_**!
${t('adminnews.editor.strikethroughText')} ~~${t('adminnews.editor.strikethrough')}~~.
  
${t('adminnews.editor.linksText')} [${t('adminnews.editor.linkExample')}](https://www.freecodecamp.com), и
> ${t('adminnews.editor.blockquote')}
  
${t('adminnews.editor.tableIntro')}:
  
${t('adminnews.editor.tableHeader1')} | ${t('adminnews.editor.tableHeader2')} | ${t('adminnews.editor.tableHeader3')}
------------ | ------------- | ------------- 
${t('adminnews.editor.tableContent1')} | ${t('adminnews.editor.tableContent2')} | ${t('adminnews.editor.tableContent3')}
${t('adminnews.editor.tableContent4')} | ${t('adminnews.editor.tableContent5')} | ${t('adminnews.editor.tableContent6')}
  
- ${t('adminnews.editor.listStart')}.
  - ${t('adminnews.editor.listItem1')}.
     - ${t('adminnews.editor.listItem2')}.
        - ${t('adminnews.editor.listItem3')}.
  
  
1. ${t('adminnews.editor.numberedListStart')}.
1. ${t('adminnews.editor.numberedListItem1')}! 
1. ${t('adminnews.editor.numberedListItem2')}.
- ${t('adminnews.editor.mixedList')}.
* ${t('adminnews.editor.imageIntro')}:

![${t('adminnews.editor.imageAlt')}](https://picsum.photos/400/300 "400x300")
    `;
  }, [t]);


  const placeholderText = useMemo(
    () => (!markedText ? defaultPlaceholder : markedText),
    [markedText, defaultPlaceholder]
  );

  // Генерация HTML
  const previewHtml = useMemo(
    () => marked(placeholderText),
    [placeholderText]
  );

  const rows = placeholderText.split("\n").length + 1;

  

  return (
    
    
     
    <div className={styles.markdownPreviewer}>
      {/* ⭐️ Применяем новый класс для margin: "1rem" */}
      <div className={`${styles.editor} col-md-12 ${styles.markdownMargin}`}>
        {/* Локализация заголовка поля ввода */}
        <label>{t('adminnews.content')}</label>

        <textarea
          className={`${styles.textArea} ${styles.taFont}`}
          rows={rows}
          value={placeholderText}
          onChange={onMarkedChange}
        ></textarea>
      </div>

      {/* ⭐️ Применяем новый класс для margin: "1rem" */}
      <div className={`col-md-12 ${styles.markdownMargin}`}>
        {/* Локализация заголовка превью */}
        <label>{t('adminnews.preview')}</label>

        <div
          className={styles.preview}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>     
</div>
  );
}