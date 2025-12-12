export const ESC = "\x1B";
export const GS = "\x1D";

export const escpos = {
  reset: ESC + "@",
  alignLeft: ESC + "a" + "\x00",
  alignCenter: ESC + "a" + "\x01",
  alignRight: ESC + "a" + "\x02",

  boldOn: ESC + "E" + "\x01",
  boldOff: ESC + "E" + "\x00",

  sizeNormal: GS + "!" + "\x00",
  size2x: GS + "!" + "\x11",

  cut: GS + "V" + "\x00",       // автообрезка
  lf: "\n",

  qr: (data: string) => {
    const bytes = new TextEncoder().encode(data);
    let size = bytes.length;

    return (
      GS + "(k" + String.fromCharCode(size + 3, 0x00) + "\x31\x50\x30" + data +
      GS + "(k" + "\x03\x00\x31\x51\x30"
    );
  },
};
