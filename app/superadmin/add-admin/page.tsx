"use client";

import { useState } from "react";
import pb from "@/lib/pocketbase";
import { useRouter } from "next/navigation";

export default function AddAdmin(){

const router = useRouter();

const [name,setName] = useState("");
const [email,setEmail] = useState("");
const [password,setPassword] = useState("");

async function handleCreate(e:any){

e.preventDefault();

try{

await pb.collection("users").create({

name:name,
email:email,
password:password,
passwordConfirm:password,
role:"admin",
emailvisibility:false

});

alert("Admin created");

router.push("/superadmin");

}catch(err:any){

console.log(err);

alert(JSON.stringify(err.data,null,2));

}

}

return(

<div className="flex h-screen justify-center items-center">

<form
onSubmit={handleCreate}
className="border p-6 rounded w-96">

<h2 className="text-xl mb-4">
Add Admin
</h2>

<input
className="border p-2 mb-3 w-full"
placeholder="Name"
onChange={(e)=>setName(e.target.value)}
/>

<input
className="border p-2 mb-3 w-full"
placeholder="Email"
type="email"
onChange={(e)=>setEmail(e.target.value)}
/>

<input
className="border p-2 mb-3 w-full"
placeholder="Password"
type="password"
onChange={(e)=>setPassword(e.target.value)}
/>

<button
className="bg-green-500 text-white p-2 w-full">

Create Admin

</button>

</form>

</div>

);

}