import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/** Paolo Pascual: a Quezon City director-cinematographer with a loud reel. */
export const preview = makePreview(manifest, {
  name: "Paolo Pascual",
  title: "Director & Cinematographer",
  company: "Pascual Pictures",
  quote: "Manila at night already lit the scene. I just find where to stand.",
  description:
    "Music videos, brand films and short documentaries, shot mostly after dark. I direct and light my own work, and I keep a small crew that has worked together since film school at UP Diliman.\n\nNow booking January to March 2027. Send the brief, the release date and the budget range, and I’ll reply with a treatment within three working days.",
  phone: "+63 917 555 0119",
  messageChannel: "whatsapp",
  email: "paolo@pascualpictures.ph",
  address: "21 Scout Rallos Street, Laging Handa, Quezon City",
  mapLat: 14.6342,
  mapLng: 121.0335,
  backgroundPhotoUrl: "/mock/reel/jeepney-night-manila.jpg",
  backgroundPhotoAlt: "A jeepney lit pink and gold driving through Manila at night",
  backgroundFocalPoint: { x: 0.55, y: 0.5 },
  overlayOpacity: 0.35,
  photoSet: "reel",
  album: [
    ["manila-city-hall-tower-night.jpg", "Manila City Hall tower, location scout for “Orasan”", "Manila City Hall clock tower lit gold at night"],
    ["cinema-camera-rig.jpg", "A-camera, rigged for a walk-and-talk", "Cinema camera on a shoulder rig"],
    ["ongpin-street-night-binondo.jpg", "Ongpin Street, Binondo, night exterior", "Ongpin Street in Binondo at night with shop signs"],
    ["film-crew-behind-the-scenes.jpg", "Second unit, behind the scenes", "Film crew setting up a shot outdoors"],
    ["video-editing-control-room.jpg", "The grade, day four", "Video control room with monitors and a mixing desk"],
    ["super8-movie-camera.jpg", "The Super 8 we still shoot titles on", "Vintage Super 8 movie camera"],
    ["jeepney-night-manila.jpg", "Jeepney plates for a music video, Sampaloc", "Jeepney driving through Manila at night"],
  ],
  links: [
    ["instagram", "https://instagram.com/pascualpictures"],
    ["youtube", "https://youtube.com/@pascualpictures"],
    ["tiktok", "https://tiktok.com/@paolo.pascual.dp"],
    ["website", "https://pascualpictures.ph/reel", "Showreel"],
  ],
  team: [
    ["paolo", null, "Paolo Pascual", "Director & DP"],
    ["jessa", "paolo", "Jessa Manalastas", "Producer"],
    ["kiko", "paolo", "Kiko Dantes", "Gaffer"],
    ["rina", "paolo", "Rina Velasco", "Editor & Colorist"],
  ],
});
