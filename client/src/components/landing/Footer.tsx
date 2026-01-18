const Footer = () => {
  return (
    <footer className="py-12 border-t border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold text-gradient-primary mb-2">NeuroLens</h3>
            <p className="text-sm text-gray-400">
              AI-powered retinal imaging for stroke risk prediction
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <a href="#problem" className="hover:text-primary transition-colors">Problem</a>
            <a href="#solution" className="hover:text-primary transition-colors">Solution</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
            <a href="#impact" className="hover:text-primary transition-colors">Impact</a>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border/30 text-center text-sm text-gray-400">
          <p>© 2024 NeuroLens Research Project. All rights reserved.</p>
          <p className="mt-2">
            Built for advancing healthcare through AI innovation
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
