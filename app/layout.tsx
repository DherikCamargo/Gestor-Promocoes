import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"Gestor de Promoções | Piloto Dherik",description:"Configuração do piloto e simulação de margem para o Mercado Livre.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
