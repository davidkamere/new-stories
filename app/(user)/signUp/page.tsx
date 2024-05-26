'use client'
import { useState } from 'react';
import Link from 'next/link';
import { supabase, supabaseClient } from '@/utils/db/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
const SignUpPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [reenterPassword, setReenterPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const router = useRouter()
    const supabase = supabaseClient

    const handleSignUp = async(e: any) => {
        e.preventDefault();

        // Check if the passwords match
        if (password !== reenterPassword) {
            setError('Passwords do not match');
            return;
        }

        // Simulating loading state
        setLoading(true);

        
        await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
          
        })
        setError('')
        router.refresh()
        setLoading(false)
        
  };

    return (
        <div className="min-h-screen bg-gradient-to-r from-blue-200 to-purple-400 rounded flex md:flex-row md:space-x-10 justify-center items-center p-5">
            <motion.div 
                initial={{ opacity: 0, x: -100 }} // Initial state for the logo, hidden and translated 100px to the left
                animate={{ opacity: 1, x: 0 }} // Animation when component is visible
                transition={{ duration: 0.5 }} // Animation duration
                className="hidden md:block" // Apply styles for the logo container
            >
                <Image src={"/logo.jpeg"} alt="logo" width={350} height={350} priority={true} className='hidden md:block'/>
            </motion.div>
            <motion.form 
                initial={{ opacity: 0, x: 100 }} // Initial state for the form, hidden and translated 100px to the right
                animate={{ opacity: 1, x: 0 }} // Animation when component is visible
                transition={{ duration: 0.5, delay: 0.2 }} // Animation duration with a delay
                onSubmit={handleSignUp}
                className="border rounded-lg px-10 md:px-28 py-10 flex flex-col items-center justify-center  border-white"
            >
            < >
                <div className="flex flex-col space-y-8 mt-6 w-full">
                    <div className="flex flex-col space-y-2">
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            className="p-3 bg-white rounded-lg ring-[#7c7c7c] ring-opacity-50 focus:ring-[#1e90ff] focus:ring-opacity-50"
                            required
                        />
                    </div>
                    <div className="flex flex-col space-y-2">
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => {
                              setError('')
                              setPassword(e.target.value)
                            }}
                            placeholder="Password"
                            className="p-3 bg-white rounded-lg ring-[#7c7c7c] ring-opacity-50 focus:ring-[#1e90ff] focus:ring-opacity-50"
                            required
                        />
                    </div>
                    <div className="flex flex-col space-y-2">
                        <input
                            type="password"
                            id="reenterPassword"
                            value={reenterPassword}
                            onChange={(e) => {
                              setError('')
                              setReenterPassword(e.target.value)
                            }}
                            placeholder="Re-enter Password"
                            className="p-3 rounded-lg ring-[#7c7c7c] ring-opacity-50 focus:ring-[#1e90ff] focus:ring-opacity-50"
                            required
                        />
                    </div>
                    {error && <div className="text-red-500 mt-0.5 text-sm text-center">{error}</div>}
                </div>
                <div className="mt-7 w-full">
                    <button
                        type="submit"
                        className="border border-black p-4 w-full font-black rounded-lg py-2 px-4 shadow-[1px_5px_1px_0_black] hover:shadow-none transform transition duration-300 ease-in-out"
                    >
                        {!loading ? <span>Sign Up</span> : <span>Signing up....</span>}
                    </button>
                </div>
                
                <div className="text-center mt-5">
                    Already have an account? <Link href="/login" className='text-[#1242c4]'>Login</Link>
                </div>
            </>
            </motion.form>
        </div>
    );
};

export default SignUpPage;
