declare module 'qrcode.react' {
    export interface QRCodeSVGProps {
        value: string;
        size?: number;
        level?: string;
        bgColor?: string;
        fgColor?: string;
        style?: object;
        includeMargin?: boolean;
        imageSettings?: {
            src: string;
            height: number;
            width: number;
            excavate: boolean;
        };
    }

    export const QRCodeSVG: React.FC<QRCodeSVGProps>;
} 