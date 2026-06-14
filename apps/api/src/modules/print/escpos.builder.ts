/**
 * ESC/POS Command Builder
 * Builds binary commands for thermal receipt printers
 * Compatible with: Xprinter, Epson TM, Sunmi, Bixolon, etc.
 */
export class EscPosBuilder {
  private buffer: number[] = [];

  // ESC/POS constants
  private static readonly ESC = 0x1b;
  private static readonly GS = 0x1d;
  private static readonly LF = 0x0a;

  init(): this {
    // Initialize printer
    this.buffer.push(EscPosBuilder.ESC, 0x40); // ESC @
    // Set Vietnamese code page (UTF-8)
    this.buffer.push(EscPosBuilder.ESC, 0x74, 0xff); // ESC t 255
    return this;
  }

  text(content: string): this {
    if (!content) return this;
    const encoded = Buffer.from(content, 'utf8');
    this.buffer.push(...encoded, EscPosBuilder.LF);
    return this;
  }

  feed(lines = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(EscPosBuilder.LF);
    }
    return this;
  }

  cut(): this {
    // GS V 1 (partial cut)
    this.buffer.push(EscPosBuilder.GS, 0x56, 0x01);
    return this;
  }

  align(alignment: 'left' | 'center' | 'right'): this {
    const values = { left: 0x00, center: 0x01, right: 0x02 };
    this.buffer.push(EscPosBuilder.ESC, 0x61, values[alignment]);
    return this;
  }

  bold(on: boolean): this {
    this.buffer.push(EscPosBuilder.ESC, 0x45, on ? 0x01 : 0x00);
    return this;
  }

  underline(on: boolean): this {
    this.buffer.push(EscPosBuilder.ESC, 0x2d, on ? 0x01 : 0x00);
    return this;
  }

  textSize(width: number, height: number): this {
    // GS ! n — character size
    const n = ((width - 1) << 4) | (height - 1);
    this.buffer.push(EscPosBuilder.GS, 0x21, n);
    return this;
  }

  separator(char = '='): this {
    const line = char.repeat(32); // 58mm = ~32 chars
    return this.text(line);
  }

  columns(col1: string, col2: string, col3: string, col4: string): this {
    const w = 32;
    const c1 = 14, c2 = 3, c3 = 7, c4 = 8;
    const line =
      col1.padEnd(c1).slice(0, c1) +
      col2.padStart(c2).slice(0, c2) +
      col3.padStart(c3).slice(0, c3) +
      col4.padStart(c4).slice(0, c4);
    return this.text(line);
  }

  items(
    items: Array<{ name: string; qty: number; price: number; total: number; note?: string | null }>,
  ): this {
    for (const item of items) {
      const qtyStr = `${item.qty}x`;
      const priceStr = item.price > 0 ? this.formatVND(item.price) : '';
      const totalStr = item.total > 0 ? this.formatVND(item.total) : '';

      // Line 1: name
      this.text(`${qtyStr} ${item.name}`);

      // Line 2: price detail (if applicable)
      if (item.total > 0) {
        this.text(`   ${priceStr} x${item.qty} = ${totalStr}`);
      }

      // Note
      if (item.note) {
        this.text(`   * ${item.note}`);
      }
    }
    return this;
  }

  // Build the final buffer
  build(): Buffer {
    return Buffer.from(this.buffer);
  }

  private formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  }
}
