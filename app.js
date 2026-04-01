import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getFirestore, collection, addDoc, doc, getDoc, updateDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tracker-6a3e5.firebaseapp.com",
  projectId: "tracker-6a3e5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// WebRTC
const pc = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

// CREATE ROOM
window.createRoom = async () => {
  const roomRef = await addDoc(collection(db, "rooms"), {});
  const roomId = roomRef.id;

  alert("Room ID: " + roomId);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await updateDoc(roomRef, {
    offer: {
      type: offer.type,
      sdp: offer.sdp
    }
  });

  onSnapshot(roomRef, (snapshot) => {
    const data = snapshot.data();
    if (data?.answer) {
      pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  });
};

// JOIN ROOM
window.joinRoom = async () => {
  const roomId = document.getElementById("roomInput").value;

  const roomRef = doc(db, "rooms", roomId);
  const roomSnapshot = await getDoc(roomRef);

  const offer = roomSnapshot.data().offer;

  await pc.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  await updateDoc(roomRef, {
    answer: {
      type: answer.type,
      sdp: answer.sdp
    }
  });
};
