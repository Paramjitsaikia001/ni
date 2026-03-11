export const jobs = [
  {
    title: "Frontend Developer",
    description: "Build responsive UI using React and TypeScript",
    skills: ["React", "JavaScript", "TypeScript"],
    experienceLevel: 1,
    companyDetails: "TechNova",
    expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 1)) // Expires in 1 month
  },
  {
    title: "Backend Developer",
    description: "Develop APIs using Node.js and Express",
    skills: ["Node.js", "Express", "MongoDB"],
    experienceLevel: 2,
    companyDetails: "CodeForge",
    expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 1))
  },
  {
    title: "AI Engineer",
    description: "Build AI applications using LangChain and LLMs",
    skills: ["Python", "LangChain", "Machine Learning"],
    experienceLevel: 2,
    companyDetails: "AI Labs",
    expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 1))
  },
  {
    title: "Blockchain Developer",
    description: "Develop Web3 applications and smart contracts",
    skills: ["Solidity", "Ethereum", "Web3"],
    experienceLevel: 1,
    companyDetails: "BlockTech",
    expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 1))
  }
];