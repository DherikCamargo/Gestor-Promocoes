// Permite que os testes importem módulos de lib/ que usam imports sem extensão (resolvidos pelo Vite no build).
import {register} from 'node:module';
register('./resolve-ts.mjs',import.meta.url);
