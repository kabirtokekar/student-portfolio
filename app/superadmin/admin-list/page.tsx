"use client";

import pb from "@/lib/pocketbase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminList(){

const router = useRouter();

const [admins,setAdmins] = useState<any[]>([]);
const [loading,setLoading] = useState(true);

const [search,setSearch] = useState("");

const [page,setPage] = useState(1);

const perPage = 5;

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

fetchAdmins();

}


async function fetchAdmins(){

try{

const records = await pb.collection("users").getFullList();

const filtered = records.filter(user =>
user.role==="admin" || user.role==="super_admin"
);

setAdmins(filtered);

}catch(err){

console.log(err);

}finally{

setLoading(false);

}

}


async function deleteAdmin(id:string){

if(!confirm("Delete this admin?")) return;

await pb.collection("users").delete(id);

setAdmins(admins.filter(a=>a.id!==id));

}


function logout(){

pb.authStore.clear();

router.replace("/login");

}


const filteredAdmins = admins.filter(admin =>

admin.name?.toLowerCase().includes(search.toLowerCase()) ||

admin.email?.toLowerCase().includes(search.toLowerCase())

);


const totalPages = Math.ceil(filteredAdmins.length/perPage);

const start = (page-1)*perPage;

const paginatedAdmins = filteredAdmins.slice(
start,
start+perPage
);


return(

<div className="flex h-screen">

{/* SIDEBAR */}

<div className="w-64 bg-blue-900 text-white p-6">

<h2 className="text-xl font-bold mb-8">
Super Admin Panel
</h2>

<div className="flex flex-col gap-4">

<button onClick={()=>router.push("/superadmin")}
className="text-left">
Dashboard
</button>

<button onClick={()=>router.push("/superadmin/add-admin")}
className="text-left">
Add Admin
</button>

<button className="text-yellow-300 text-left">
View Admins
</button>

<button onClick={logout}
className="text-red-300 text-left">

Logout

</button>

</div>

</div>


{/* MAIN */}

<div className="flex-1 p-10 bg-gray-100">

<h1 className="text-3xl font-bold mb-6">
Admin Management
</h1>


{/* SEARCH */}

<input

type="text"

placeholder="Search admin..."

value={search}

onChange={(e)=>{
setSearch(e.target.value);
setPage(1);
}}

className="border p-2 mb-6 w-80 rounded"

/>


{loading ? (

<p>Loading...</p>

) : (

<div className="bg-white rounded shadow">

<table className="w-full">

<thead className="bg-gray-200">

<tr>

<th className="p-4 text-left">
Name
</th>

<th className="p-4 text-left">
Email
</th>

<th className="p-4 text-left">
Role
</th>

<th className="p-4 text-center">
Action
</th>

</tr>

</thead>

<tbody>

{paginatedAdmins.map(admin=>(

<tr
key={admin.id}
className="border-t hover:bg-gray-50">

<td className="p-4">
{admin.name}
</td>

<td className="p-4">
{admin.email}
</td>

<td className="p-4">

{admin.role==="super_admin" ? (

<span className="bg-purple-200 text-purple-800 px-3 py-1 rounded text-sm">
Super Admin
</span>

) : (

<span className="bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm">
Admin
</span>

)}

</td>

<td className="p-4 text-center">

{admin.role!=="super_admin" &&(

<button

onClick={()=>deleteAdmin(admin.id)}

className="bg-red-500 text-white px-4 py-1 rounded">

Delete

</button>

)}

</td>

</tr>

))}

</tbody>

</table>


{/* PAGINATION */}

<div className="flex justify-between p-4">

<button

disabled={page===1}

onClick={()=>setPage(page-1)}

className="bg-gray-300 px-3 py-1 rounded">

Previous

</button>


<p>

Page {page} of {totalPages || 1}

</p>


<button

disabled={page===totalPages}

onClick={()=>setPage(page+1)}

className="bg-gray-300 px-3 py-1 rounded">

Next

</button>

</div>


</div>

)}

</div>

</div>

);

}