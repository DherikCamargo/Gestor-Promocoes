import Connection from './connection';
import SimpleCatalog from './simple-catalog';
export default function Home(){
 return <main><header><div className="brand">GP<span>Gestor de Promoções</span></div></header><div className="workspace simple-workspace"><SimpleCatalog/><details className="account-settings"><summary>Conexão com o Mercado Livre</summary><Connection/></details></div></main>;
}
