/**
 * MemeGen AI - Offline-First PWA Application Logic
 * Integrates Canvas Editing, IndexedDB Storage, AI Caption Engine, Auto-Templates, and Service Worker registration.
 */

// ==========================================
// 1. CONSTANTS & MEME PRESETS (SVG DATA URIS)
// ==========================================
const PRESET_TEMPLATES = [
  {
    id: 'drake',
    name: 'Drake Hotline Bling',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="%23f8fafc"/><rect width="300" height="300" fill="%23ef4444"/><text x="150" y="160" font-size="70" text-anchor="middle" fill="white">👎</text><rect y="300" width="300" height="300" fill="%2310b981"/><text x="150" y="460" font-size="70" text-anchor="middle" fill="white">👍</text><line x1="300" y1="0" x2="300" y2="600" stroke="%23cbd5e1" stroke-width="6"/><line x1="0" y1="300" x2="600" y2="300" stroke="%23cbd5e1" stroke-width="6"/></svg>'
  },
  {
    id: 'two-buttons',
    name: 'Two Buttons',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="%231e293b"/><rect x="60" y="100" width="200" height="120" rx="20" fill="%23ef4444" stroke="white" stroke-width="6"/><circle cx="160" cy="160" r="30" fill="%23f87171"/><rect x="340" y="100" width="200" height="120" rx="20" fill="%23ef4444" stroke="white" stroke-width="6"/><circle cx="440" cy="160" r="30" fill="%23f87171"/><path d="M 300,500 L 200,220 M 300,500 L 400,220" stroke="%2364748b" stroke-width="12" stroke-linecap="round"/><circle cx="300" cy="520" r="40" fill="%2338bdf8"/></svg>'
  },
  {
    id: 'distracted-bf',
    name: 'Distracted Boyfriend',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="%230f172a"/><rect x="40" y="200" width="140" height="300" rx="20" fill="%23ec4899"/><text x="110" y="170" font-size="40" text-anchor="middle" fill="white">🚶‍♀️ New Thing</text><rect x="230" y="200" width="140" height="300" rx="20" fill="%233b82f6"/><text x="300" y="170" font-size="40" text-anchor="middle" fill="white">👀 Me</text><rect x="420" y="200" width="140" height="300" rx="20" fill="%2310b981"/><text x="490" y="170" font-size="40" text-anchor="middle" fill="white">🙎‍♀️ Current Task</text></svg>'
  },
  {
    id: 'change-my-mind',
    name: 'Change My Mind',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="%23f1f5f9"/><rect x="80" y="250" width="440" height="220" fill="%23ffffff" stroke="%23334155" stroke-width="8" rx="10"/><text x="300" y="440" font-size="28" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="%230f172a">CHANGE MY MIND</text><circle cx="480" cy="180" r="45" fill="%236366f1"/><path d="M 450 180 Q 480 130 510 180" stroke="white" stroke-width="6" fill="none"/></svg>'
  },
  {
    id: 'doge',
    name: 'Doge Classic',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="%23fde047"/><circle cx="300" cy="300" r="200" fill="%23eab308"/><circle cx="230" cy="250" r="25" fill="%23000"/><circle cx="370" cy="250" r="25" fill="%23000"/><circle cx="240" cy="240" r="8" fill="%23fff"/><circle cx="380" cy="240" r="8" fill="%23fff"/><ellipse cx="300" cy="320" rx="35" ry="25" fill="%23000"/><path d="M250 360 Q300 410 350 360" fill="none" stroke="%23000" stroke-width="10" stroke-linecap="round"/></svg>'
  },
  {
    id: 'expanded-brain',
    name: 'Expanded Brain',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="%230284c7"/><line x1="0" y1="150" x2="600" y2="150" stroke="white" stroke-width="4"/><line x1="0" y1="300" x2="600" y2="300" stroke="white" stroke-width="4"/><line x1="0" y1="450" x2="600" y2="450" stroke="white" stroke-width="4"/><circle cx="500" cy="75" r="30" fill="%2338bdf8"/><circle cx="500" cy="225" r="40" fill="%23818cf8"/><circle cx="500" cy="375" r="50" fill="%23c084fc"/><circle cx="500" cy="525" r="60" fill="%23f43f5e"/></svg>'
  }
];

const OFFLINE_CAPTION_DATABASE = {
  relatable: [
    "Me explaining to my cat why I can't stay home all day",
    "My 3 AM brain remembering an embarrassing moment from 2014",
    "Me after doing 5 minutes of basic adulting",
    "When you check your bank account after a wild weekend",
    "Me pretending to listen while planning my dinner",
    "When someone asks 'How are you?' and you accidentally answer honestly"
  ],
  tech: [
    "It worked on localhost, why would it fail in prod?",
    "When you fix a bug by removing 100 lines of legacy code",
    "1 hour spent coding vs 5 hours naming a variable",
    "Pushing straight to main on a Friday at 4:59 PM",
    "When standard CSS Grid solves what took 40 NPM packages",
    "It's not a bug, it's an undocumented feature!"
  ],
  work: [
    "This meeting could have been a 1-sentence email",
    "Me nodding in the Zoom meeting with my mic muted and camera off",
    "When the deadline is tomorrow and you start today",
    "Per my previous email (translation: can you read?)",
    "My team celebrating a milestone I contributed 1% to"
  ],
  gaming: [
    "Just one more game... (3 hours later)",
    "When the boss has a second health bar",
    "Blaming lag when you clearly missed the shot",
    "Skipping the tutorial and complaining the game is too hard",
    "When you finally beat the level after 50 tries"
  ],
  crypto: [
    "Buy the dip! (The dip keeps dipping)",
    "Me checking crypto prices every 3 seconds",
    "HODL through the storm",
    "1 BTC = 1 BTC always",
    "When my $20 investment goes up by $0.05"
  ]
};

// ==========================================
// 2. INDEXEDDB STORAGE MANAGER
// ==========================================
const DB_NAME = 'MemeGeneratorDB';
const DB_VERSION = 1;
let dbPromise = null;

function initDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('memes')) {
        db.createObjectStore('memes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function saveMemeToDB(meme) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('memes', 'readwrite');
    tx.objectStore('memes').put(meme);
    tx.oncomplete = () => resolve(meme);
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllMemesFromDB() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('memes', 'readonly');
    const req = tx.objectStore('memes').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteMemeFromDB(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('memes', 'readwrite');
    tx.objectStore('memes').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearAllMemesFromDB() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('memes', 'readwrite');
    tx.objectStore('memes').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function saveCustomTemplateToDB(template) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    tx.objectStore('templates').put(template);
    tx.oncomplete = () => resolve(template);
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllCustomTemplatesFromDB() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readonly');
    const req = tx.objectStore('templates').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// 3. CANVAS STATE & DRAG/DROP ENGINE
// ==========================================
class MemeCanvasEditor {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.backgroundImage = null;
    this.layers = [];
    this.selectedLayerId = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };

    this.initCanvasSize(600, 600);
    this.bindEvents();
  }

  initCanvasSize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.render();
  }

  setBackground(imgSrc) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.backgroundImage = img;
        // Adjust canvas aspect ratio to fit image while capping max size
        const maxDim = 800;
        let w = img.width;
        let h = img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        this.canvas.width = w || 600;
        this.canvas.height = h || 600;

        this.render();
        resolve(img);
      };
      img.src = imgSrc;
    });
  }

  addTextLayer(text = 'TOP TEXT', options = {}) {
    const id = 'layer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    const defaultY = this.layers.length === 0 ? 30 : (this.layers.length === 1 ? this.canvas.height - 100 : this.canvas.height / 2 - 40);

    const layer = {
      id,
      type: 'text',
      text: text,
      x: options.x !== undefined ? options.x : this.canvas.width / 2,
      y: options.y !== undefined ? options.y : defaultY,
      fontSize: options.fontSize || 38,
      fontFamily: options.fontFamily || 'Impact',
      fillColor: options.fillColor || '#ffffff',
      strokeColor: options.strokeColor || '#000000',
      strokeWidth: options.strokeWidth !== undefined ? options.strokeWidth : 5,
      align: options.align || 'center',
      allCaps: options.allCaps !== undefined ? options.allCaps : true,
      shadow: options.shadow !== undefined ? options.shadow : true
    };

    this.layers.push(layer);
    this.selectedLayerId = id;
    this.render();
    return layer;
  }

  addStickerLayer(stickerChar = '🔥', x, y) {
    const id = 'sticker_' + Date.now();
    const layer = {
      id,
      type: 'text',
      text: stickerChar,
      x: x || this.canvas.width / 2,
      y: y || this.canvas.height / 2,
      fontSize: 70,
      fontFamily: 'Arial',
      fillColor: '#ffffff',
      strokeColor: 'transparent',
      strokeWidth: 0,
      align: 'center',
      allCaps: false,
      shadow: false
    };
    this.layers.push(layer);
    this.selectedLayerId = id;
    this.render();
    return layer;
  }

  getSelectedLayer() {
    return this.layers.find(l => l.id === this.selectedLayerId);
  }

  deleteSelectedLayer() {
    if (!this.selectedLayerId) return;
    this.layers = this.layers.filter(l => l.id !== this.selectedLayerId);
    this.selectedLayerId = this.layers.length > 0 ? this.layers[this.layers.length - 1].id : null;
    this.render();
  }

  moveLayerOrder(direction) {
    if (!this.selectedLayerId) return;
    const idx = this.layers.findIndex(l => l.id === this.selectedLayerId);
    if (idx === -1) return;

    if (direction === 'up' && idx < this.layers.length - 1) {
      const temp = this.layers[idx];
      this.layers[idx] = this.layers[idx + 1];
      this.layers[idx + 1] = temp;
    } else if (direction === 'down' && idx > 0) {
      const temp = this.layers[idx];
      this.layers[idx] = this.layers[idx - 1];
      this.layers[idx - 1] = temp;
    }
    this.render();
  }

  // Helper method for automatic line wrapping
  getWrappedLines(layer, maxWidth) {
    const textStr = layer.allCaps ? layer.text.toUpperCase() : layer.text;
    const paragraphs = textStr.split('\n');
    const lines = [];

    this.ctx.font = `bold ${layer.fontSize}px ${layer.fontFamily}`;

    paragraphs.forEach(para => {
      const words = para.split(' ');
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const metrics = this.ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine !== '') {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);
    });

    return lines.length > 0 ? lines : [''];
  }

  // Pointer event coordinate handler
  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  bindEvents() {
    const onStart = (e) => {
      const coords = this.getCanvasCoords(e);
      // Hit testing layers in reverse order (topmost first)
      for (let i = this.layers.length - 1; i >= 0; i--) {
        const layer = this.layers[i];
        const bbox = this.getLayerBoundingBox(layer);
        if (
          coords.x >= bbox.x &&
          coords.x <= bbox.x + bbox.width &&
          coords.y >= bbox.y &&
          coords.y <= bbox.y + bbox.height
        ) {
          this.selectedLayerId = layer.id;
          this.isDragging = true;
          this.dragOffset = {
            x: coords.x - layer.x,
            y: coords.y - layer.y
          };
          this.render();
          if (this.onLayerSelect) this.onLayerSelect(layer);
          return;
        }
      }

      // Clicked on empty space
      this.selectedLayerId = null;
      this.render();
      if (this.onLayerSelect) this.onLayerSelect(null);
    };

    const onMove = (e) => {
      if (!this.isDragging || !this.selectedLayerId) return;
      e.preventDefault();
      const coords = this.getCanvasCoords(e);
      const layer = this.getSelectedLayer();
      if (layer) {
        layer.x = coords.x - this.dragOffset.x;
        layer.y = coords.y - this.dragOffset.y;
        this.render();
      }
    };

    const onEnd = () => {
      this.isDragging = false;
    };

    this.canvas.addEventListener('mousedown', onStart);
    this.canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    this.canvas.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }

  getLayerBoundingBox(layer) {
    const maxWrapWidth = this.canvas.width - 40;
    const lines = this.getWrappedLines(layer, maxWrapWidth);

    let maxWidth = 0;
    lines.forEach(line => {
      const metrics = this.ctx.measureText(line);
      if (metrics.width > maxWidth) maxWidth = metrics.width;
    });

    const lineHeight = layer.fontSize * 1.15;
    const totalHeight = lines.length * lineHeight;

    let x = layer.x;
    if (layer.align === 'center') x = layer.x - maxWidth / 2;
    else if (layer.align === 'right') x = layer.x - maxWidth;

    // Correct baseline math matching textBaseline = 'top'
    const y = layer.y;

    return {
      x: x - 10,
      y: y - 5,
      width: maxWidth + 20,
      height: totalHeight + 10
    };
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Draw Background
    if (this.backgroundImage) {
      this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.ctx.fillStyle = '#1e293b';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#64748b';
      this.ctx.font = '24px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Select or upload a meme template', this.canvas.width / 2, this.canvas.height / 2);
    }

    // 2. Draw Text & Sticker Layers
    this.layers.forEach((layer) => {
      this.ctx.save();

      const maxWrapWidth = this.canvas.width - 40;
      const lines = this.getWrappedLines(layer, maxWrapWidth);

      this.ctx.font = `bold ${layer.fontSize}px ${layer.fontFamily}`;
      this.ctx.textAlign = layer.align || 'center';
      this.ctx.textBaseline = 'top';

      if (layer.shadow) {
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 3;
        this.ctx.shadowOffsetY = 3;
      }

      const lineHeight = layer.fontSize * 1.15;

      lines.forEach((line, index) => {
        const lineY = layer.y + index * lineHeight;

        if (layer.strokeWidth > 0 && layer.strokeColor !== 'transparent') {
          this.ctx.strokeStyle = layer.strokeColor;
          this.ctx.lineWidth = layer.strokeWidth;
          this.ctx.lineJoin = 'round';
          this.ctx.strokeText(line, layer.x, lineY);
        }

        this.ctx.fillStyle = layer.fillColor;
        this.ctx.fillText(line, layer.x, lineY);
      });

      this.ctx.restore();

      // 3. Draw Selection Highlight Outline if Active Layer
      if (layer.id === this.selectedLayerId) {
        const bbox = this.getLayerBoundingBox(layer);
        this.ctx.save();
        this.ctx.strokeStyle = '#6366f1';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([6, 4]);
        this.ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);

        // Corner selection indicators
        this.ctx.fillStyle = '#6366f1';
        this.ctx.fillRect(bbox.x - 4, bbox.y - 4, 8, 8);
        this.ctx.fillRect(bbox.x + bbox.width - 4, bbox.y - 4, 8, 8);
        this.ctx.fillRect(bbox.x - 4, bbox.y + bbox.height - 4, 8, 8);
        this.ctx.fillRect(bbox.x + bbox.width - 4, bbox.y + bbox.height - 4, 8, 8);
        this.ctx.restore();
      }
    });
  }

  toDataURL() {
    const currentSelected = this.selectedLayerId;
    this.selectedLayerId = null;
    this.render();
    const dataUrl = this.canvas.toDataURL('image/png');
    this.selectedLayerId = currentSelected;
    this.render();
    return dataUrl;
  }
}

// ==========================================
// 4. SMART IMAGE ANALYZER ("AUTO-TEMPLATES")
// ==========================================
function analyzeCanvasImage(canvas, ctx) {
  const width = canvas.width;
  const height = canvas.height;
  const aspectRatio = width / height;

  let aspectStr = '1:1 (Square)';
  if (aspectRatio > 1.2) aspectStr = 'Landscape / Wide';
  else if (aspectRatio < 0.8) aspectStr = 'Portrait / Tall';

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let totalR = 0, totalG = 0, totalB = 0;
  const sampleStep = 10 * 4;
  let count = 0;

  for (let i = 0; i < data.length; i += sampleStep) {
    totalR += data[i];
    totalG += data[i + 1];
    totalB += data[i + 2];
    count++;
  }

  const avgR = Math.round(totalR / count);
  const avgG = Math.round(totalG / count);
  const avgB = Math.round(totalB / count);

  const hexColor = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`;

  const luminance = (0.299 * avgR + 0.587 * avgG + 0.114 * avgB) / 255;
  const isDark = luminance < 0.5;

  let recFill = '#ffffff';
  let recStroke = '#000000';
  if (!isDark) {
    recFill = '#000000';
    recStroke = '#ffffff';
  }

  let recommendedPlacement = 'Top & Bottom Split';
  if (aspectRatio > 1.4) {
    recommendedPlacement = 'Single Top Header Banner';
  } else if (aspectRatio < 0.75) {
    recommendedPlacement = 'Centered Overlay Stack';
  }

  return {
    aspectStr,
    hexColor,
    luminanceStr: isDark ? 'Dark Image' : 'Light Image',
    recommendedPlacement,
    recFill,
    recStroke
  };
}

// ==========================================
// 5. AI CAPTION GENERATOR & HASHTAG ENGINE
// ==========================================
async function generateAICaptions(category, customPrompt) {
  const provider = localStorage.getItem('meme_ai_provider') || 'offline';
  const apiKey = localStorage.getItem('meme_ai_key') || '';

  if (provider === 'openai' && apiKey) {
    try {
      const prompt = customPrompt || `funny viral meme caption about ${category}`;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a hilarious viral meme caption generator. Return 3 short, snappy meme captions separated by newlines.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8
        })
      });
      const data = await response.json();
      if (data.choices && data.choices[0]) {
        const text = data.choices[0].message.content.trim();
        return text.split('\n').filter(Boolean);
      }
    } catch (err) {
      console.warn('OpenAI API call failed, falling back to offline engine:', err);
    }
  }

  if (provider === 'gemini' && apiKey) {
    try {
      const prompt = customPrompt || `funny viral meme caption about ${category}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Generate 3 short funny meme captions for: ${prompt}` }] }]
        })
      });
      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text.split('\n').filter(Boolean);
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to offline engine:', err);
    }
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      let pool = OFFLINE_CAPTION_DATABASE[category] || OFFLINE_CAPTION_DATABASE.relatable;
      if (category === 'custom' && customPrompt) {
        pool = [
          `When you try to ${customPrompt}`,
          `Nobody:\nMe during ${customPrompt}:`,
          `Expectation vs Reality: ${customPrompt}`
        ];
      }
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      resolve(shuffled.slice(0, 3));
    }, 400);
  });
}

function generateHashtags(caption, category) {
  const baseTags = ['#MemeGen', '#OfflinePWA', '#ViralMemes', '#MemeOfTheDay'];
  const categoryTags = {
    relatable: ['#Relatable', '#EverydayLife', '#MeIRL', '#Humor'],
    tech: ['#DevHumor', '#CodeLife', '#BugOrFeature', '#WebDev', '#SoftwareEngineer'],
    work: ['#WorkplaceHumor', '#CorporateLife', '#ZoomFail', '#MondayVibes'],
    gaming: ['#GamerLife', '#NoobMoments', '#GamingMemes', '#LevelUp'],
    crypto: ['#CryptoMemes', '#HODL', '#ToTheMoon', '#Bitcoin']
  };

  const selectedCat = categoryTags[category] || categoryTags.relatable;
  const words = caption.replace(/[^a-zA-Z0-9 ]/g, '').split(' ');
  const wordTags = words.filter(w => w.length > 4).slice(0, 2).map(w => `#${w.charAt(0).toUpperCase() + w.slice(1)}`);

  const combined = Array.from(new Set([...baseTags, ...selectedCat, ...wordTags]));
  return combined.slice(0, 6).join(' ');
}

// ==========================================
// 6. MAIN CONTROLLER & APPLICATION BINDINGS
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('ServiceWorker registered:', reg.scope))
      .catch(err => console.error('ServiceWorker registration failed:', err));
  }

  const statusBadge = document.getElementById('offline-badge');
  const statusText = document.getElementById('status-text');

  function updateOnlineStatus() {
    if (navigator.onLine) {
      statusBadge.className = 'status-badge online';
      statusText.textContent = 'Online';
    } else {
      statusBadge.className = 'status-badge offline';
      statusText.textContent = 'Offline Mode';
    }
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  const editor = new MemeCanvasEditor('meme-canvas');

  await editor.setBackground(PRESET_TEMPLATES[0].url);
  editor.addTextLayer('TOP TEXT', { y: 30 });
  editor.addTextLayer('BOTTOM TEXT', { y: editor.canvas.height - 100 });

  const templatesGrid = document.getElementById('templates-grid');
  const customTemplatesGrid = document.getElementById('custom-templates-grid');
  const fileInput = document.getElementById('file-input');

  const layerControls = document.getElementById('layer-controls');
  const noLayerSelected = document.getElementById('no-layer-selected');
  const textContentInput = document.getElementById('text-content-input');
  const fontFamilySelect = document.getElementById('font-family-select');
  const fontSizeInput = document.getElementById('font-size-input');
  const fontSizeVal = document.getElementById('font-size-val');
  const fillColorInput = document.getElementById('fill-color-input');
  const fillColorHex = document.getElementById('fill-color-hex');
  const strokeColorInput = document.getElementById('stroke-color-input');
  const strokeColorHex = document.getElementById('stroke-color-hex');
  const strokeWidthInput = document.getElementById('stroke-width-input');
  const strokeWidthVal = document.getElementById('stroke-width-val');
  const allCapsCheckbox = document.getElementById('all-caps-checkbox');
  const shadowCheckbox = document.getElementById('shadow-checkbox');
  const layersList = document.getElementById('layers-list');

  PRESET_TEMPLATES.forEach(tpl => {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.innerHTML = `<img src="${tpl.url}" alt="${tpl.name}"><div class="card-title">${tpl.name}</div>`;
    card.addEventListener('click', async () => {
      await editor.setBackground(tpl.url);
    });
    templatesGrid.appendChild(card);
  });

  async function refreshCustomTemplatesUI() {
    const customTpls = await getAllCustomTemplatesFromDB();
    customTemplatesGrid.innerHTML = '';
    if (customTpls.length === 0) {
      customTemplatesGrid.innerHTML = '<p class="empty-msg">No custom templates saved yet.</p>';
      return;
    }
    customTpls.forEach(tpl => {
      const card = document.createElement('div');
      card.className = 'template-card';
      card.innerHTML = `<img src="${tpl.dataUrl}" alt="${tpl.name}"><div class="card-title">${tpl.name}</div>`;
      card.addEventListener('click', async () => {
        await editor.setBackground(tpl.dataUrl);
      });
      customTemplatesGrid.appendChild(card);
    });
  }
  await refreshCustomTemplatesUI();

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      await editor.setBackground(dataUrl);
      await saveCustomTemplateToDB({
        id: 'tpl_' + Date.now(),
        name: file.name || 'Custom Upload',
        dataUrl
      });
      await refreshCustomTemplatesUI();
    };
    reader.readAsDataURL(file);
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  function updateLayerControlsUI(layer) {
    if (!layer) {
      layerControls.classList.add('hidden');
      noLayerSelected.classList.remove('hidden');
      renderLayersList();
      return;
    }

    noLayerSelected.classList.add('hidden');
    layerControls.classList.remove('hidden');

    textContentInput.value = layer.text;
    fontFamilySelect.value = layer.fontFamily;
    fontSizeInput.value = layer.fontSize;
    fontSizeVal.textContent = layer.fontSize;
    fillColorInput.value = layer.fillColor;
    fillColorHex.textContent = layer.fillColor;
    strokeColorInput.value = layer.strokeColor;
    strokeColorHex.textContent = layer.strokeColor;
    strokeWidthInput.value = layer.strokeWidth;
    strokeWidthVal.textContent = layer.strokeWidth;
    allCapsCheckbox.checked = layer.allCaps;
    shadowCheckbox.checked = layer.shadow;

    document.querySelectorAll('.btn-toggle[data-align]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.align === layer.align);
    });

    renderLayersList();
  }

  function renderLayersList() {
    layersList.innerHTML = '';
    editor.layers.forEach((layer, index) => {
      const item = document.createElement('div');
      item.className = `layer-item ${layer.id === editor.selectedLayerId ? 'active' : ''}`;
      item.innerHTML = `<span>${index + 1}. ${layer.text.substring(0, 20) || 'Empty Layer'}</span><span>✏️</span>`;
      item.addEventListener('click', () => {
        editor.selectedLayerId = layer.id;
        editor.render();
        updateLayerControlsUI(layer);
      });
      layersList.appendChild(item);
    });
  }

  editor.onLayerSelect = (layer) => updateLayerControlsUI(layer);

  textContentInput.addEventListener('input', (e) => {
    const layer = editor.getSelectedLayer();
    if (layer) { layer.text = e.target.value; editor.render(); renderLayersList(); }
  });

  fontFamilySelect.addEventListener('change', (e) => {
    const layer = editor.getSelectedLayer();
    if (layer) { layer.fontFamily = e.target.value; editor.render(); }
  });

  fontSizeInput.addEventListener('input', (e) => {
    const layer = editor.getSelectedLayer();
    if (layer) {
      layer.fontSize = parseInt(e.target.value);
      fontSizeVal.textContent = layer.fontSize;
      editor.render();
    }
  });

  fillColorInput.addEventListener('input', (e) => {
    const layer = editor.getSelectedLayer();
    if (layer) {
      layer.fillColor = e.target.value;
      fillColorHex.textContent = e.target.value;
      editor.render();
    }
  });

  strokeColorInput.addEventListener('input', (e) => {
    const layer = editor.getSelectedLayer();
    if (layer) {
      layer.strokeColor = e.target.value;
      strokeColorHex.textContent = e.target.value;
      editor.render();
    }
  });

  strokeWidthInput.addEventListener('input', (e) => {
    const layer = editor.getSelectedLayer();
    if (layer) {
      layer.strokeWidth = parseInt(e.target.value);
      strokeWidthVal.textContent = layer.strokeWidth;
      editor.render();
    }
  });

  allCapsCheckbox.addEventListener('change', (e) => {
    const layer = editor.getSelectedLayer();
    if (layer) { layer.allCaps = e.target.checked; editor.render(); }
  });

  shadowCheckbox.addEventListener('change', (e) => {
    const layer = editor.getSelectedLayer();
    if (layer) { layer.shadow = e.target.checked; editor.render(); }
  });

  document.querySelectorAll('.btn-toggle[data-align]').forEach(btn => {
    btn.addEventListener('click', () => {
      const layer = editor.getSelectedLayer();
      if (layer) {
        layer.align = btn.dataset.align;
        document.querySelectorAll('.btn-toggle[data-align]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        editor.render();
      }
    });
  });

  document.getElementById('btn-layer-up').addEventListener('click', () => editor.moveLayerOrder('up'));
  document.getElementById('btn-layer-down').addEventListener('click', () => editor.moveLayerOrder('down'));
  document.getElementById('btn-delete-layer').addEventListener('click', () => {
    editor.deleteSelectedLayer();
    updateLayerControlsUI(editor.getSelectedLayer());
  });

  document.getElementById('btn-add-text').addEventListener('click', () => {
    const layer = editor.addTextLayer('NEW TEXT OVERLAY');
    updateLayerControlsUI(layer);
  });

  document.getElementById('btn-add-sticker').addEventListener('click', () => {
    const stickers = ['🔥', '😂', '💀', '🤡', '💯', '🚀', '👀'];
    const randomSticker = stickers[Math.floor(Math.random() * stickers.length)];
    const layer = editor.addStickerLayer(randomSticker);
    updateLayerControlsUI(layer);
  });

  const analysisPanel = document.getElementById('analysis-panel');
  const btnAnalyzeImage = document.getElementById('btn-analyze-image');
  const btnCloseAnalysis = document.getElementById('btn-close-analysis');
  const btnApplyAnalysis = document.getElementById('btn-apply-analysis');

  let currentAnalysis = null;

  btnAnalyzeImage.addEventListener('click', () => {
    currentAnalysis = analyzeCanvasImage(editor.canvas, editor.ctx);
    document.getElementById('analysis-aspect').textContent = currentAnalysis.aspectStr;
    document.getElementById('analysis-color-swatch').style.backgroundColor = currentAnalysis.hexColor;
    document.getElementById('analysis-color-code').textContent = currentAnalysis.hexColor;
    document.getElementById('analysis-luminance').textContent = currentAnalysis.luminanceStr;
    document.getElementById('analysis-placement').textContent = currentAnalysis.recommendedPlacement;

    document.getElementById('rec-fill').style.backgroundColor = currentAnalysis.recFill;
    document.getElementById('rec-stroke').style.backgroundColor = currentAnalysis.recStroke;

    analysisPanel.classList.remove('hidden');
  });

  btnCloseAnalysis.addEventListener('click', () => analysisPanel.classList.add('hidden'));

  btnApplyAnalysis.addEventListener('click', () => {
    if (!currentAnalysis) return;
    editor.layers.forEach(layer => {
      layer.fillColor = currentAnalysis.recFill;
      layer.strokeColor = currentAnalysis.recStroke;
    });
    editor.render();
    if (editor.getSelectedLayer()) updateLayerControlsUI(editor.getSelectedLayer());
    analysisPanel.classList.add('hidden');
  });

  const aiCategorySelect = document.getElementById('ai-category-select');
  const customPromptContainer = document.getElementById('custom-prompt-container');
  const aiCustomPrompt = document.getElementById('ai-custom-prompt');
  const btnGenerateAI = document.getElementById('btn-generate-ai');
  const aiLoading = document.getElementById('ai-loading');
  const aiResults = document.getElementById('ai-results');
  const aiCaptionsList = document.getElementById('ai-captions-list');
  const hashtagsText = document.getElementById('hashtags-text');
  const btnCopyHashtags = document.getElementById('btn-copy-hashtags');

  aiCategorySelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customPromptContainer.classList.remove('hidden');
    } else {
      customPromptContainer.classList.add('hidden');
    }
  });

  btnGenerateAI.addEventListener('click', async () => {
    aiLoading.classList.remove('hidden');
    aiResults.classList.add('hidden');

    const category = aiCategorySelect.value;
    const prompt = aiCustomPrompt.value;
    const captions = await generateAICaptions(category, prompt);

    aiLoading.classList.add('hidden');
    aiResults.classList.remove('hidden');

    aiCaptionsList.innerHTML = '';
    captions.forEach(cap => {
      const item = document.createElement('div');
      item.className = 'caption-item';
      item.textContent = cap;
      item.addEventListener('click', () => {
        const activeLayer = editor.getSelectedLayer();
        if (activeLayer) {
          activeLayer.text = cap;
        } else {
          editor.addTextLayer(cap);
        }
        editor.render();
        updateLayerControlsUI(editor.getSelectedLayer());
      });
      aiCaptionsList.appendChild(item);
    });

    const hashtags = generateHashtags(captions[0] || '', category);
    hashtagsText.textContent = hashtags;
  });

  btnCopyHashtags.addEventListener('click', () => {
    navigator.clipboard.writeText(hashtagsText.textContent);
    btnCopyHashtags.textContent = '✅ Copied!';
    setTimeout(() => { btnCopyHashtags.textContent = '📋 Copy'; }, 2000);
  });

  const galleryGrid = document.getElementById('gallery-grid');
  const galleryCount = document.getElementById('gallery-count');
  const btnClearGallery = document.getElementById('btn-clear-gallery');

  async function refreshGalleryUI() {
    const savedMemes = await getAllMemesFromDB();
    galleryCount.textContent = savedMemes.length;
    galleryGrid.innerHTML = '';

    if (savedMemes.length === 0) {
      galleryGrid.innerHTML = '<p class="empty-gallery">No memes saved yet. Create a meme above and click "Save to Gallery"!</p>';
      btnClearGallery.classList.add('hidden');
      return;
    }

    btnClearGallery.classList.remove('hidden');

    savedMemes.forEach(meme => {
      const card = document.createElement('div');
      card.className = 'gallery-item';
      card.innerHTML = `
        <img src="${meme.dataUrl}" alt="Saved Meme">
        <div class="gallery-item-actions">
          <button class="btn btn-sm btn-primary btn-re-edit">✏️ Re-Edit</button>
          <button class="btn btn-sm btn-secondary btn-download">⬇️ Download</button>
          <button class="btn btn-sm btn-danger btn-delete">🗑️ Delete</button>
        </div>
      `;

      card.querySelector('.btn-re-edit').addEventListener('click', async () => {
        if (meme.backgroundImage) {
          await editor.setBackground(meme.backgroundImage);
        }
        if (meme.layers) {
          editor.layers = JSON.parse(JSON.stringify(meme.layers));
          editor.selectedLayerId = editor.layers.length > 0 ? editor.layers[0].id : null;
          editor.render();
          updateLayerControlsUI(editor.getSelectedLayer());
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      card.querySelector('.btn-download').addEventListener('click', () => {
        downloadDataURL(meme.dataUrl, `meme-${meme.id}.png`);
      });

      card.querySelector('.btn-delete').addEventListener('click', async () => {
        await deleteMemeFromDB(meme.id);
        await refreshGalleryUI();
      });

      galleryGrid.appendChild(card);
    });
  }

  await refreshGalleryUI();

  document.getElementById('btn-save-meme').addEventListener('click', async () => {
    const dataUrl = editor.toDataURL();
    const memeRecord = {
      id: 'meme_' + Date.now(),
      createdAt: new Date().toISOString(),
      dataUrl,
      backgroundImage: editor.backgroundImage ? editor.backgroundImage.src : null,
      layers: editor.layers
    };
    await saveMemeToDB(memeRecord);
    await refreshGalleryUI();

    const btn = document.getElementById('btn-save-meme');
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ Saved!';
    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
  });

  btnClearGallery.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all saved memes from local storage?')) {
      await clearAllMemesFromDB();
      await refreshGalleryUI();
    }
  });

  function downloadDataURL(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  document.getElementById('btn-download-meme').addEventListener('click', () => {
    const dataUrl = editor.toDataURL();
    downloadDataURL(dataUrl, `meme-${Date.now()}.png`);
  });

  document.getElementById('btn-share-meme').addEventListener('click', async () => {
    const dataUrl = editor.toDataURL();
    if (navigator.share && navigator.canShare) {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'meme.png', { type: 'image/png' });
        await navigator.share({
          title: 'Check out my meme!',
          text: hashtagsText.textContent || '#MemeGen',
          files: [file]
        });
      } catch (err) {
        console.log('Share canceled or failed:', err);
      }
    } else {
      downloadDataURL(dataUrl, `meme-${Date.now()}.png`);
    }
  });

  const apiModal = document.getElementById('api-modal');
  const btnApiSettings = document.getElementById('btn-api-settings');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnSaveApiSettings = document.getElementById('btn-save-api-settings');
  const aiProviderSelect = document.getElementById('ai-provider-select');
  const apiKeyGroup = document.getElementById('api-key-group');
  const apiKeyInput = document.getElementById('api-key-input');

  btnApiSettings.addEventListener('click', () => {
    aiProviderSelect.value = localStorage.getItem('meme_ai_provider') || 'offline';
    apiKeyInput.value = localStorage.getItem('meme_ai_key') || '';
    apiKeyGroup.classList.toggle('hidden', aiProviderSelect.value === 'offline');
    apiModal.classList.remove('hidden');
  });

  aiProviderSelect.addEventListener('change', (e) => {
    apiKeyGroup.classList.toggle('hidden', e.target.value === 'offline');
  });

  btnCloseModal.addEventListener('click', () => apiModal.classList.add('hidden'));

  btnSaveApiSettings.addEventListener('click', () => {
    localStorage.setItem('meme_ai_provider', aiProviderSelect.value);
    localStorage.setItem('meme_ai_key', apiKeyInput.value.trim());
    apiModal.classList.add('hidden');
  });

  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  btnThemeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    btnThemeToggle.textContent = newTheme === 'light' ? '☀️' : '🌙';
  });
});
