const fs = require('fs');

function updateFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // add focus-visible:ring-2 to classes of interactive elements: button, a, input, select, textarea
  const tagRegex = /<(button|a|input|select|textarea)\b([^>]*?)className=(["'])(.*?)\3/gs;

  let replaced = content.replace(tagRegex, (match, tag, before, quote, classStr) => {
    if (!classStr.includes('focus-visible:ring-2') && !classStr.includes('focus:ring-2')) {
      const newClassStr = classStr + ' focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none';
      return `<${tag}${before}className=${quote}${newClassStr}${quote}`;
    }
    return match;
  });

  fs.writeFileSync(file, replaced, 'utf8');
  console.log(`Updated ${file}`);
}

updateFile('./components/LandingPage.tsx');
updateFile('./App.tsx');
updateFile('./components/StepProfile.tsx');
updateFile('./components/StepJob.tsx');
