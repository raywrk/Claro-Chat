import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'claro-chat';

  messages: { sender: 'bot' | 'user'; text?: string; imageUrl?: string }[] = [];
  inputValue = '';
  step: 'intro' | 'state' | 'typical' | 'upload' | 'done' = 'intro';

  userState = '';
  userTypical = '';

  isTyping = false;
  pendingBotMessages = 0;
  delayBetweenMessages = 900;

  @ViewChild('canvas', { static: false }) canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('messagesContainer', { static: false }) messagesEl?: ElementRef<HTMLDivElement>;

  ngOnInit() {
    this.botSaySeq([
      'Juntos, conquistamos coisas incríveis esse ano e agora queremos ir além! Então, complete a frase: A Claro tá na nossa! Bora pra 2026 com:',
      'Responda com: "Atitude que transforma."'
    ]);
  }

  pushBot(text: string) {
    this.messages.push({ sender: 'bot', text });
    this.scrollToBottom();
  }

  pushUser(text: string) {
    this.messages.push({ sender: 'user', text });
    this.scrollToBottom();
  }

  botSay(text: string, delayMs = 700) {
    this.pendingBotMessages++;
    this.isTyping = true;
    setTimeout(() => {
      this.pushBot(text);
      this.pendingBotMessages--;
      if (this.pendingBotMessages <= 0) {
        this.isTyping = false;
        this.pendingBotMessages = 0;
      }
    }, delayMs);
  }

  botSaySeq(texts: string[]) {
    texts.forEach((t, i) => this.botSay(t, this.delayBetweenMessages * (i + 1)));
  }

  onSend() {
    const text = this.inputValue.trim();
    if (!text) return;
    this.pushUser(text);
    this.inputValue = '';

    if (this.step === 'intro') {
      if (text.toLowerCase() === 'atitude que transforma.') {
        this.botSay('Isso mesmo! Agora conta pra gente: de qual estado você é?');
        this.step = 'state';
      } else {
        this.botSay('Boa! A resposta oficial é "Atitude que transforma.". Agora, de qual estado você é?');
        this.step = 'state';
      }
    } else if (this.step === 'state') {
      this.userState = text;
      this.botSaySeq([
        'Me diz o que no seu estado todo mundo precisa conhecer!',
        'Pode ser algo típico: pão de queijo, chimarrão, praia, tererê, acarajé...',
        'Ao participar, você já está concorrendo ao brinde com a estampa personalizada!'
      ]);
      this.step = 'typical';
    } else if (this.step === 'typical') {
      this.userTypical = text;
      this.botSay('Demais! Para fechar, faça o upload de uma foto. Em troca, te enviamos uma imagem personalizada para postar: "A Claro tá na nossa #bora2026"');
      this.step = 'upload';
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      this.composeImage(src).then((finalUrl) => {
        this.messages.push({ sender: 'bot', text: 'Sua imagem personalizada está pronta! Faça o download e compartilhe.', imageUrl: finalUrl });
        this.step = 'done';
        this.scrollToBottom();
      });
    };
    reader.readAsDataURL(file);
  }

  async composeImage(photoDataUrl: string): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas não suportado');

    const baseImage = await this.loadImage(photoDataUrl);

    const size = 1080;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    const scale = Math.min(size / baseImage.width, size / baseImage.height);
    const drawW = baseImage.width * scale;
    const drawH = baseImage.height * scale;
    const dx = (size - drawW) / 2;
    const dy = (size - drawH) / 2;
    ctx.drawImage(baseImage, dx, dy, drawW, drawH);

    const border = 24;
    ctx.strokeStyle = '#d50000';
    ctx.lineWidth = border;
    ctx.strokeRect(border / 2, border / 2, size - border, size - border);

    const barH = 180;
    ctx.fillStyle = 'rgba(213, 0, 0, 0.9)';
    ctx.fillRect(0, size - barH, size, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const mainText = 'A Claro tá na nossa #bora2026';
    ctx.fillText(mainText, 40, size - barH + 40);

    ctx.font = 'bold 44px Arial';
    const stateHash = `#${this.toHashtag(this.userState)}`;
    ctx.fillText(stateHash, 40, size - barH + 110);

    const rightW = 380;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(size - rightW, 0, rightW, size - barH);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 38px Arial';
    const items = this.buildItems(this.userTypical);
    let y = 80;
    for (const line of items) {
      ctx.fillText(line, size - rightW + 30, y);
      y += 56;
    }
    ctx.font = 'bold 34px Arial';
    ctx.fillText('A Claro tá na nossa', size - rightW + 30, y + 20);

    return canvas.toDataURL('image/png');
  }

  toHashtag(state: string) {
    return state
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      || 'Brasil';
  }

  buildItems(typical: string): string[] {
    const text = typical.trim();
    if (!text) return ['Arte', 'Café', 'Simpatia'];
    const raw = text.split(/[\s,;]+/).filter(Boolean).slice(0, 6);
    const clean = raw.map((w) => this.capitalize(w));
    if (clean.length === 1) return [clean[0]];
    const last = clean.pop() as string;
    return [...clean, `${last}.`];
  }

  capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  scrollToBottom() {
    setTimeout(() => {
      const el = this.messagesEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }
}
