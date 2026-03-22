"use client";

import { useEffect } from "react";
import { useState } from "react";
import pb from "@/lib/pocketbase";
import { useRouter } from "next/navigation";

export default function Login(){

const router = useRouter();

const [email,setEmail] = useState("");
const [password,setPassword] = useState("");

const handleLogin = async (e:any)=>{

e.preventDefault();

try{

const authData = await pb.collection("users")
.authWithPassword(email,password);

console.log(authData);

if(authData.record.role==="super_admin"){
router.push("/superadmin");
}

if(authData.record.role==="admin"){
router.push("/admin");
}

}catch(error){

alert("Login failed");

}

};

useEffect(()=>{

if(pb.authStore.isValid){

if(pb.authStore.model?.role==="super_admin"){
router.replace("/superadmin");
}

}

},[]);

return(

<div className="flex h-screen justify-center items-center">

<form 
onSubmit={handleLogin}
className="border p-6 rounded w-80">

<h2 className="text-xl mb-4 text-center">
Login
</h2>

<input
className="border p-2 mb-3 w-full"
type="email"
placeholder="Email"
onChange={(e)=>setEmail(e.target.value)}
/>

<input
className="border p-2 mb-3 w-full"
type="password"
placeholder="Password"
onChange={(e)=>setPassword(e.target.value)}
/>

<button
className="bg-blue-500 text-white p-2 w-full">

Login

</button>

</form>

</div>

);

}