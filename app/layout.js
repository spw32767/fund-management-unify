// app/layout.js - Root Layout with AuthProvider
import { AuthProvider } from './contexts/AuthContext';
import './globals.css';

export const metadata = {
  title: 'กองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ - วิทยาลัยการคอมพิวเตอร์ มข.',
  description: 'ระบบบริหารจัดการทุนวิจัยสำหรับอาจารย์และเจ้าหน้าที่ วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น',
  keywords: 'fund management, research fund, university, computer science, KKU',
  authors: [{ name: 'วิทยาลัยการคอมพิวเตอร์ มข.' }],
  robots: 'noindex, nofollow', // Prevent indexing for internal system
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="font-sans">
        <AuthProvider>
          <div id="root">
            {children}
          </div>
          
          {/* Portal for modals */}
          <div id="modal-root"></div>
          
          {/* Portal for notifications */}
          <div id="notification-root"></div>
        </AuthProvider>
      </body>
    </html>
  );
}