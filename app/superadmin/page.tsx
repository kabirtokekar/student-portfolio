"use client";

import pb from "@/lib/pocketbase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdmin(){

const router = useRouter();

const [adminCount,setAdminCount] = useState(0);
const [userCount,setUserCount] = useState(0);

useEffect(()=>{

checkAccess();

},[]);


async function checkAccess(){

if(!pb.authStore.isValid){
router.replace("/login");
return;
}

if(pb.authStore.model?.role !== "super_admin"){
router.replace("/login");
return;
}

fetchStats();

}


async function fetchStats(){

try{

const users = await pb.collection("users").getFullList();

const admins = users.filter(user=>user.role==="admin");

setAdminCount(admins.length);

setUserCount(users.length);

}catch(err){

console.log(err);

}

}


function logout(){

pb.authStore.clear();

router.replace("/login");

}


return(

<div className="flex h-screen">

{/* SIDEBAR */}

<div className="w-64 bg-blue-900 text-white p-6">

<h2 className="text-xl font-bold mb-8">
Super Admin Panel
</h2>

<div className="flex flex-col gap-4">

<button
onClick={()=>router.push("/superadmin")}
className="text-left text-yellow-300">

Dashboard

</button>

<button
onClick={()=>router.push("/superadmin/add-admin")}
className="text-left hover:text-yellow-300">

Add Admin

</button>

<button
onClick={()=>router.push("/superadmin/admin-list")}
className="text-left hover:text-yellow-300">

View Admins

</button>

<button
onClick={logout}
className="text-left text-red-300">

Logout

</button>

</div>

</div>


{/* MAIN AREA */}

<div className="flex-1 p-10 bg-gray-100">

<h1 className="text-3xl font-bold mb-8">
Super Admin Dashboard
</h1>


{/* STAT CARDS */}

<div className="grid grid-cols-3 gap-6">

<div className="bg-white p-6 rounded shadow">

<h3 className="text-gray-500">
Total Admins
</h3>

<p className="text-3xl font-bold text-blue-600">
{adminCount}
</p>

</div>


<div className="bg-white p-6 rounded shadow">

<h3 className="text-gray-500">
Total Users
</h3>

<p className="text-3xl font-bold text-green-600">
{userCount}
</p>

</div>


<div className="bg-white p-6 rounded shadow">

<h3 className="text-gray-500">
System Status
</h3>

<p className="text-3xl font-bold text-green-500">
Active
</p>

</div>

</div>


{/* QUICK ACTIONS */}

<div className="mt-10 bg-white p-6 rounded shadow">

<h2 className="text-xl font-bold mb-4">
Quick Actions
</h2>

<div className="flex gap-4">

<button
onClick={()=>router.push("/superadmin/add-admin")}
className="bg-blue-500 text-white px-4 py-2 rounded">

Add Admin

</button>

<button
onClick={()=>router.push("/superadmin/admin-list")}
className="bg-gray-700 text-white px-4 py-2 rounded">

Manage Admins

</button>

</div>

</div>

</div>

</div>

);

}