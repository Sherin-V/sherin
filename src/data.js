export const socials = [
  { label: 'GitHub', href: 'https://github.com/Sherin-V' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/sherin-varghese-04b6831ba/' },
  { label: 'Discord', href: 'https://discord.gg/t7aRDBYREs' },
]

export const skills = ['React', 'JavaScript', 'HTML & CSS', 'Java', 'SQL', 'Firebase', 'UI/UX design']

// Projects shown as game cartridges.
// image: a screenshot in public/assets, or null for "coming soon".
// live / code: full URLs, or '' to hide that button. liveLabel: what A opens, when it is not a website.
// icon: the site's own icon, shown in front of the live link.
const asset = (file) => `${import.meta.env.BASE_URL}assets/${file}`

export const projects = [
  {
    title: 'Nex',
    color: '#3d5afe',
    blurb: 'My own Node.js framework, on npm as sv-nex: databases, HTTP and sockets, email, uploads and sessions behind one simple setup.',
    tech: ['Node.js', 'Express', 'MySQL', 'npm'],
    image: asset('project-nex.jpg'),
    live: 'https://www.npmjs.com/package/sv-nex',
    liveLabel: 'NPM PACKAGE', // a package, not a website
    icon: asset('icon-npm.svg'),
    code: 'https://github.com/Red-Blue-co/Nex',
  },
  {
    title: 'QODE',
    color: '#ff5a36',
    blurb: 'A round code I designed from scratch: hexagon dots with three states, read live by your phone camera right in the browser.',
    tech: ['JavaScript', 'Node.js', 'Canvas', 'Web Workers'],
    image: asset('project-qode.jpg'),
    live: 'https://qode.sherin.fun',
    icon: asset('icon-qode.svg'),
    code: 'https://github.com/Red-Blue-co/qode',
  },
  {
    title: 'Red-Blue',
    color: '#ffc531',
    blurb: 'A full-stack app with sign-in, email codes and products, built on Nex and running on my own cloud server.',
    tech: ['React', 'Express', 'MySQL', 'Nex'],
    image: asset('project-red-blue.jpg'),
    live: 'https://app.sherin.fun',
    icon: asset('icon-red-blue.svg'),
    code: 'https://github.com/Red-Blue-co/Red-Blue',
  },
]

// Services as sticky notes: `note` is the paper colour, `tags` the handwritten line at the bottom
export const services = [
  { title: 'Web apps', note: '#ffc531', tags: 'React · Firebase', text: 'Fast React apps that grow with your users. Prototype to launch, front end to database.' },
  { title: 'UI/UX design', note: '#f2ede4', tags: 'wireframes · animation', text: 'Interfaces that feel good to use. We sketch it together first, then I make it move.' },
  { title: 'Databases', note: '#ff8a6b', tags: 'SQL · Firebase', text: 'Data models designed around how your app actually works, kept clean and safe.' },
  { title: 'Websites', note: '#a9b6ff', tags: 'custom design · fast', text: 'Distinctive sites that load fast and look sharp, designed around your idea.' },
  { title: 'E-commerce', note: '#ffc531', tags: 'catalogue · checkout', text: 'Online shops that work end to end, from the product catalogue to the checkout.' },
  { title: 'Hosting', note: '#f2ede4', tags: 'domain · deploys', text: 'Low-cost hosting and domain set up, so your site stays online without the hassle.' },
]

export const journey = [
  {
    when: 'Now',
    title: 'Junior Software Engineer',
    where: 'Macrix',
    color: '#e2231a', // Macrix red
    text: 'Building software full-time.',
  },
  {
    when: 'Graduated',
    title: 'MSc Computer Science',
    where: 'IU International University of Applied Sciences',
    text: 'Completed. Dual studies, combining university with hands-on work.',
  },
  {
    when: '2022',
    title: 'Learn the Art of Hacking through Programming',
    where: 'LAHTP online course',
    text: 'Security-focused programming and technical fundamentals.',
  },
  {
    when: '2020 – 2022',
    title: 'Bachelor of Computer Applications',
    where: 'G. H. Raisoni Institute of Business Management',
    text: 'Affiliated to KBC North Maharashtra University, Jalgaon. NAAC grade "A", CGPA 3.09.',
  },
  {
    when: 'Ongoing',
    title: 'Crossroads',
    where: 'YouTube community',
    text: 'A small community that helps students grow into their next role.',
  },
]

// Hero looks to choose from. `bg` and `ink` are applied to the hero section.
export const VARIANTS = [
  { id: 'candy', name: 'Candy glass', bg: '#141312', ink: '#f2ede4', accent: '#ff5a36' },
  { id: 'chrome', name: 'Liquid chrome', bg: '#0b1026', ink: '#eef1ff', accent: '#5ee7ff' },
  { id: 'blocks', name: 'Toy blocks', bg: '#f2ede4', ink: '#141312', accent: '#ff5a36' },
  { id: 'rings', name: 'Ring tunnel', bg: '#07051a', ink: '#f1ecff', accent: '#9b7bff' },
  { id: 'wave', name: 'Particle wave', bg: '#04120c', ink: '#e9fff4', accent: '#3dffa8' },
  { id: 'gold', name: 'Gold sculpture', bg: '#1b140d', ink: '#f6ead6', accent: '#e8b04a' },
]

// Google Apps Script web app that saves each message to a Sheet and emails it (apps-script/contact.gs)
export const FORM_URL =
  'https://script.google.com/macros/s/AKfycbzFT-57fRSgkQkKWXaBQkhk0uYaUiq9ED6PH6BPuv7cS1hysZTPhJocDwByGhylJyrc9w/exec'
