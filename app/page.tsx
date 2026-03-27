"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Users, Building2, Award, ArrowRight, GraduationCap, Briefcase, Shield } from "lucide-react";

export default function Home() {
  const router = useRouter();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const loginCards = [
    {
      role: "student",
      title: "Student Login",
      description: "Access your portfolio, achievements, and academic records",
      icon: GraduationCap,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      role: "staff",
      title: "Staff Login",
      description: "Manage student records and verification processes",
      icon: Users,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200"
    },
    {
      role: "recruiter",
      title: "Recruiter Login",
      description: "Verify credentials and explore student portfolios",
      icon: Briefcase,
      color: "from-violet-500 to-violet-600",
      bgColor: "bg-violet-50",
      borderColor: "border-violet-200"
    }
  ];

  const stats = [
    { value: "70+", label: "Years of Excellence", icon: Building2 },
    { value: "10,000+", label: "Students Enrolled", icon: Users },
    { value: "95%", label: "Placement Rate", icon: Award },
    { value: "50+", label: "Programs Offered", icon: BookOpen }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* TOP HEADER */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src="/sgsits-logo.png"
                  alt="SGSITS Logo"
                  className="h-16 w-auto object-contain"
                />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  Shri Govindram Seksaria Institute
                </h1>
                <p className="text-sm text-gray-600">
                  of Technology & Science
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                    Autonomous
                  </span>
                  <span className="text-xs text-gray-500">Est. 1952</span>
                </div>
              </div>
            </div>

            {/* System Branding */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-100">
                <img
                  src="/portfolio-logo.png"
                  alt="Portfolio System"
                  className="h-10 w-auto"
                />
                <span className="font-bold text-red-700 text-sm">
                  Student Portfolio<br />System
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push("/login?role=admin")}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-gray-900/20"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
                <span className="sm:hidden">Admin</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* HERO SECTION */}
      <section className="relative h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/college.jpg"
            alt="SGSITS Campus"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-blue-900/70 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-2xl text-white"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6 border border-white/30"
            >
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Now Accepting Applications 2025-26</span>
            </motion.div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Shaping Future
              <span className="block text-amber-400">Engineers & Leaders</span>
            </h2>

            <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-xl leading-relaxed">
              One of Madhya Pradesh's premier engineering institutes, fostering innovation, 
              research, and excellence since 1952.
            </p>

            <div className="flex flex-wrap gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/login?role=student")}
                className="flex items-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors border border-white/30"
              >
                Learn More
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-white/20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <stat.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* LOGIN PORTAL SECTION */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Access Your Portal
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose your role to access the Student Portfolio & Verification System
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            {loginCards.map((card) => (
              <motion.div
                key={card.role}
                variants={itemVariants}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                onClick={() => router.push(`/login?role=${card.role}`)}
                className={`group cursor-pointer ${card.bgColor} ${card.borderColor} border-2 rounded-2xl p-8 transition-all duration-300 hover:shadow-xl`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <card.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {card.title}
                </h3>

                <p className="text-gray-600 mb-6 leading-relaxed">
                  {card.description}
                </p>

                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 group-hover:gap-3 transition-all">
                  <span>Login Now</span>
                  <ArrowRight className={`w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors`} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-6">
                <Building2 className="w-4 h-4" />
                About Institute
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Legacy of Excellence in
                <span className="text-blue-600"> Engineering Education</span>
              </h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Shri Govindram Seksaria Institute of Technology and Science (SGSITS) stands 
                  as one of the oldest and most prestigious engineering institutes in Madhya Pradesh. 
                  Established in 1952, we have been at the forefront of technical education and research.
                </p>
                <p>
                  Our autonomous status enables us to design cutting-edge curricula that meet 
                  industry demands while maintaining academic rigor. With state-of-the-art 
                  laboratories, experienced faculty, and strong industry connections, we prepare 
                  students for global challenges.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                {[
                  { label: "NAAC Accreditation", value: "A Grade" },
                  { label: "NBA Accredited", value: "Programs" },
                  { label: "Research Centers", value: "15+" },
                  { label: "Industry Partners", value: "200+" }
                ].map((item) => (
                  <div key={item.label} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-2xl font-bold text-blue-600">{item.value}</p>
                    <p className="text-sm text-gray-600">{item.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="/college.jpg"
                  alt="SGSITS Campus Life"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <p className="text-lg font-semibold">Campus Life at SGSITS</p>
                  <p className="text-sm text-gray-200">Where innovation meets tradition</p>
                </div>
              </div>

              {/* Floating Badge */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 bg-white p-4 rounded-xl shadow-xl border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <Award className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Ranked Top</p>
                    <p className="text-xs text-gray-600">Engineering College in MP</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Academic Calendar</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Placement Cell</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Research & Development</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Alumni Network</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>23, Sir M. Visvesvaraya Marg</li>
                <li>Indore, Madhya Pradesh 452003</li>
                <li>Phone: +91-731-2541256</li>
                <li>Email: info@sgsits.ac.in</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Student Portfolio System</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                A comprehensive platform for managing student achievements, 
                verifications, and recruitment processes.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 SGSITS. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              System Operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}