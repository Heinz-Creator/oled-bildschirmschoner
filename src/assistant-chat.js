const sectionLabels = 'Zutaten(?:liste)?|Zubereitung|Voraussetzungen|Anleitung|Schritte|So geht[’\x27]?s|Tipps?|Hinweise?|Varianten|Vorteile|Nachteile|Beispiele?|Kurz gesagt|Fazit';
const inlineHeading = new RegExp('(^|[ \\t])(?:\\*\\*)?(' + sectionLabels + ')\\s*:\\s*(?:\\*\\*)?[ \\t]*', 'giu');
const sentences = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('de', { granularity: 'sentence' }) : null;

function paragraphBlocks(text) {
  if (text.length < 240) return [{ type: 'paragraph', text }];
  const parts = sentences ? Array.from(sentences.segment(text), part => part.segment)
    : text.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/u);
  const blocks = [];
  let paragraph = '';
  for (const part of parts) {
    if (paragraph.length >= 150) {
      blocks.push({ type: 'paragraph', text: paragraph });
      paragraph = '';
    }
    paragraph = [paragraph, part.trim()].filter(Boolean).join(' ');
  }
  if (paragraph) blocks.push({ type: 'paragraph', text: paragraph });
  return blocks;
}

function plainIngredients(text) {
  const items = text.split(/;\s+|,\s+(?=(?:\d|[A-ZÄÖÜ]))/u);
  return items.length > 1 ? { type: 'list', ordered: false, items } : null;
}

export function answerBlocks(answer) {
  const blocks = [];
  let ingredients = false;
  let code;
  for (const line of answer.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*\x60{3}/.test(line)) {
      if (code) {
        blocks.push({ type: 'code', text: code.join('\n') });
        code = undefined;
      } else code = [];
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    // Voice answers can also arrive with Markdown markers on a single line.
    const withSections = line.replace(/[ \t]+(?=#{2,6}[ \t]+)/g, '\n')
      .split('\n').map(segment => {
        const heading = segment.match(/^(\s*#{1,6}\s+.+?)[ \t]+(?=[-•*]\s|1[.)]\s)/u);
        return heading ? segment.replace(heading[0], heading[1] + '\n')
          : /^\s*#{1,6}\s/.test(segment) ? segment : segment.replace(inlineHeading, '\n## $2\n');
      }).join('\n');
    const formatted = withSections.split('\n').map(segment => {
      if (/^\s*[-•*]\s+/.test(segment) || (segment.match(/[ \t]+[-•]\s+/gu)?.length ?? 0) >= 2) {
        return segment.replace(/[ \t]+(?=[-•]\s+)/gu, '\n');
      }
      if (/(?:^|\s)1[.)]\s/.test(segment) && /(?:^|\s)2[.)]\s/.test(segment)) {
        let next = 1;
        return segment.replace(/(^|[ \t]+)(\d{1,2})([.)])(?=\s)/g, (marker, space, number, delimiter) => {
          if (Number(number) !== next) return marker;
          next++;
          return `${space ? '\n' : ''}${number}${delimiter}`;
        });
      }
      return segment;
    }).join('\n');
    for (const part of formatted.split('\n').map(value => value.trim()).filter(Boolean)) {
      const heading = part.match(/^(?:#{1,6}\s+(.+)|\*\*(.+)\*\*)$/);
      if (heading) {
        const text = (heading[1] || heading[2]).replace(/:$/, '');
        ingredients = /^Zutaten/iu.test(text);
        blocks.push({ type: 'heading', text });
        continue;
      }
      const item = part.match(/^(?:(\d{1,2})[.)]|[-•*])\s+(.+)$/u);
      if (item) {
        const ordered = Boolean(item[1]);
        const last = blocks.at(-1);
        if (last?.type === 'list' && last.ordered === ordered) last.items.push(item[2]);
        else blocks.push({ type: 'list', ordered, start: Number(item[1]) || 1, items: [item[2]] });
        continue;
      }
      const ingredientList = ingredients && plainIngredients(part);
      if (ingredientList) blocks.push(ingredientList);
      else blocks.push(...paragraphBlocks(part));
    }
  }
  if (code?.length) blocks.push({ type: 'code', text: code.join('\n') });
  return blocks;
}

function appendInline(element, value) {
  const pattern = /\*\*([^*\n]+)\*\*|\x60([^\x60\n]+)\x60|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gu;
  let start = 0;
  for (const match of value.matchAll(pattern)) {
    const [token, bold, code, label, url] = match;
    element.append(value.slice(start, match.index));
    const child = document.createElement(bold ? 'strong' : code ? 'code' : 'a');
    child.textContent = bold || code || label;
    if (url) {
      child.href = url;
      child.target = '_blank';
      child.rel = 'noopener noreferrer';
    }
    element.append(child);
    start = match.index + token.length;
  }
  element.append(value.slice(start));
}

function recipeImage(image, description, preparation = false) {
  const figure = document.createElement('figure');
  if (preparation) figure.className = 'recipe-preparation';
  const picture = document.createElement('img');
  picture.src = image;
  picture.alt = description;
  picture.decoding = 'async';
  figure.append(picture);
  return figure;
}

export function renderAssistantAnswer(message, question, images) {
  const blocks = answerBlocks(message);
  const context = question + ' ' + message;
  const hasRecipe = blocks.some(block => block.type === 'heading' && /^(?:Zutaten|Zubereitung)/iu.test(block.text));
  const gulasch = /gulasch/iu.test(context) &&
    !/vegan|vegetarisch|gulaschsuppe|schweinegulasch|putengulasch/iu.test(context) &&
    (hasRecipe || /\brezept\b/iu.test(question) && /\b(?:schmoren|anbraten|paprikapulver)\b/iu.test(message));
  const article = document.createElement('article');
  article.className = gulasch ? 'chat-answer chat-formatted chat-recipe' : 'chat-answer chat-formatted';
  const recipeTitle = gulasch ? blocks.find(block => block.type === 'heading' && /gulasch/iu.test(block.text)) : null;
  const needsRecipeTitle = gulasch || (blocks[0]?.type === 'heading');
  if (needsRecipeTitle) {
    const heading = document.createElement('h3');
    appendInline(heading, gulasch ? (recipeTitle?.text || 'Gulaschrezept') : blocks[0].text);
    article.append(heading);
  }
  if (gulasch && images?.cover) article.append(recipeImage(images.cover, 'Serviervorschlag für klassisches Rindergulasch'));

  let preparationShown = false;
  for (const [index, block] of blocks.entries()) {
    if (block === recipeTitle || (!gulasch && needsRecipeTitle && index === 0)) continue;
    let element;
    if (block.type === 'heading') {
      element = document.createElement('h4');
      appendInline(element, block.text);
    } else if (block.type === 'list') {
      element = document.createElement(block.ordered ? 'ol' : 'ul');
      if (block.ordered) element.start = block.start;
      for (const item of block.items) {
        const li = document.createElement('li');
        appendInline(li, item);
        element.append(li);
      }
    } else {
      element = document.createElement(block.type === 'code' ? 'pre' : 'p');
      if (block.type === 'code') element.textContent = block.text;
      else appendInline(element, block.text);
    }
    article.append(element);
    if (gulasch && !preparationShown && images?.preparation &&
        (block.type === 'heading' && /^Zubereitung/iu.test(block.text) || block.type === 'list' && block.ordered)) {
      article.append(recipeImage(images.preparation, 'Gulasch beim Anbraten im Schmortopf', true));
      preparationShown = true;
    }
  }
  if (gulasch && !preparationShown && images?.preparation) {
    article.append(recipeImage(images.preparation, 'Gulasch beim Anbraten im Schmortopf', true));
  }
  const firstText = blocks.find(block => block.type === 'heading' || block.type === 'paragraph')?.text;
  const snippet = gulasch ? 'Gulasch · Rezept ansehen' : (firstText || message)
    .replace(/\[([^\]\n]+)\]\(https?:\/\/[^\s)]+\)/gu, '$1')
    .replace(/\*\*|\x60/g, '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const expanded = gulasch || message.length >= 360 || blocks.some(block => block.type === 'heading' || block.type === 'list' || block.type === 'code') || blocks.length >= 3;
  return { article, snippet, expanded, blocks };
}
