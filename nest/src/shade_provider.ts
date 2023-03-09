export class ShadeProvider {
    private shades = [
        '#E2F0CB',
        '#B5EAD7',
        '#C7CEEA',
        '#FF9AA2',
        '#FFB7B2',
        '#FFDAC1',
    ];
    private shadeIdx = 0;

    nextShade(): string {
        return this.shades[this.shadeIdx++ % this.shades.length]
    }
}