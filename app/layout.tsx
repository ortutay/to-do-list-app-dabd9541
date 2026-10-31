import type {ReactNode} from 'react';
import './globals.css';
export const metadata={title:"To-Do List App"};
export default function Layout({children}:{children:ReactNode}){return <html lang="en"><body>{children}<footer style={{padding:24,fontFamily:'system-ui',fontSize:12}}><a href={"http://localhost:3000/buy/2a67fcc7-e038-4838-a1b0-1d6601be96b7"}>Support this project · test checkout</a> · Built with AiFundMe</footer></body></html>}