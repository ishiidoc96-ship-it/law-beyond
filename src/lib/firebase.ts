import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyD75suz5V9bKQWzXF_VR7SUktp47oWd0H8",
  authDomain: "bnnm-3d1e3.firebaseapp.com",
  projectId: "bnnm-3d1e3",
  storageBucket: "bnnm-3d1e3.firebasestorage.app",
  messagingSenderId: "1013538040065",
  appId: "1:1013538040065:web:094e1f36230eadb4c45300",
  measurementId: "G-28V52RQP56"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
