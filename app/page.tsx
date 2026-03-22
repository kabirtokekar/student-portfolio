"use client";

import { useRouter } from "next/navigation";

export default function Home(){

const router = useRouter();

return(

<div>

{/* TOP HEADER */}

<div className="flex justify-between items-center bg-gray-100 p-3">

<div className="flex items-center gap-3">

<img 
src="/sgsits-logo.png"
className="h-14"
/>

<div>

<h2 className="font-bold">
Shri Govindram Seksaria Institute of Technology & Science
</h2>

<p className="text-sm">
Autonomous Institute • Established 1952
</p>

</div>

</div>

<div className="flex items-center gap-3">

<img 
src="/portfolio-logo.png"
className="h-12"
/>

<h2 className="font-bold text-red-600">
Student Portfolio System
</h2>

</div>

<div>

<button
onClick={()=>router.push("/login?role=admin")}
className="bg-black text-white px-4 py-2 rounded">

Admin Login

</button>

</div>

</div>


{/* NAVBAR */}

<div className="flex gap-8 bg-blue-900 text-white p-3">

<button onClick={()=>router.push("/")}>
Home
</button>

<button onClick={()=>router.push("/login?role=staff")}>
Staff Login
</button>

<button onClick={()=>router.push("/login?role=student")}>
Student Login
</button>

<button onClick={()=>router.push("/login?role=recruiter")}>
Recruiter Login
</button>

</div>


{/* HERO IMAGE */}

<div>

<img
src="/college.jpg"
className="w-full h-[400px] object-cover"
/>

</div>


{/* ABOUT SECTION */}

<div className="p-10">

<h2 className="text-3xl font-bold mb-4">
About Institute
</h2>

<p>

Welcome to SGSITS. Shri Govindram Seksaria Institute of Technology and Science is one of the oldest engineering institutes in Madhya Pradesh. The institute focuses on academic excellence, placements, and innovation.

</p>

</div>


</div>

);

} 