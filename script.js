document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Efeito Sanfona (Accordion) do FAQ
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('is-open');
                }
            });
            item.classList.toggle('is-open');
        });
    });

    // 2. Ativador das Animações de Entrada Direcionais
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('is-visible');
                }, 50);
                observer.unobserve(entry.target); // Para de observar para manter o item fixo
            }
        });
    }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.12
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // 3. Monitoramento do Botão Voltar ao Topo
    const backToTopBtn = document.querySelector('.back-to-top');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                backToTopBtn.classList.add('is-visible');
            } else {
                backToTopBtn.classList.remove('is-visible');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    //  Balão do WhatsApp Inteligente
    const waBubble = document.getElementById('wa-bubble');
    const closeBubble = document.getElementById('close-bubble');

    if (waBubble && closeBubble) {
        // Mostra o balão após 7 segundos (7000 milissegundos)
        setTimeout(() => {
            // Verifica se o usuário já não fechou nesta sessão
            if (!sessionStorage.getItem('wa-bubble-closed')) {
                waBubble.classList.add('is-visible');
            }
        }, 7000);

        // Fecha o balão ao clicar no X
        closeBubble.addEventListener('click', (e) => {
            e.preventDefault();
            waBubble.classList.remove('is-visible');
            // Salva no navegador para não ficar abrindo toda hora que ela der F5
            sessionStorage.setItem('wa-bubble-closed', 'true'); 
        });
    }
});