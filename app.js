var book = ePub("./images.epub"),
    rendition = book.renderTo("viewer", {
    width: "100%",
    height: 600,
    ignoreClass: 'annotator-hl',
    manager: "continuous",
  });

/**
 * Ultimo subrayado realizado
 */
var lastSelectedHightlight = {
    text: '',
    cfirange: '',
    contents: {}
}

/**
 * Subrayados guardados
 */
var hightLights = [];


/**
 * Cfi marcado
 */
const currentCfi = localStorage.currentCfi;
rendition.display(currentCfi);

book.ready.then(() => {

    document.getElementById("next").addEventListener("click", function(e){
        e.preventDefault();
        rendition.next();
    });

    document.getElementById("prev").addEventListener("click", function(e){
        e.preventDefault();
        rendition.prev();
    });

    const keyListener = function(e){

        // Left Key
        if ((e.keyCode || e.which) == 37) {
            rendition.prev();
        }

        // Right Key
        if ((e.keyCode || e.which) == 39) 
           rendition.next();

    };

    rendition.on("keyup", keyListener);
    document.addEventListener("keyup", keyListener);
    document.getElementById('mark').addEventListener('click', markCurrent)
    document.getElementById("toc").addEventListener('change', changeChapter)
    document.getElementById('highlight').addEventListener('click', actionsHighlight)
    document.getElementById('subrayar').addEventListener('click', pushHightlight)
})

/**
 * Llenar las opciones del select de capitulos
 */
book.loaded.navigation.then(function(toc){
    let $select = document.getElementById("toc"),
        docfrag = document.createDocumentFragment();

    toc.forEach(function(chapter) {
        let option = document.createElement("option");
        
        /**
         * A veces la variable @book (book.navigation.toc) obtiene un sufijo en el href de los capitulos. Ejemplo. #pgepubid00000. 
         * Eso no se refleja en el href de @rendition (rendition.location.start.href)
         * 
         * Regex para evitar errores
         */

        let hrefValue = chapter.href.replace(/[#].*/, '')

        option.textContent = chapter.label;
        option.setAttribute("ref", hrefValue);
        
        if(hrefValue == localStorage.chapter){
            option.setAttribute('selected', true);
        }

        docfrag.appendChild(option);
    });

    $select.appendChild(docfrag);
});

/**
 * Oculta flechas al inicio y al final
 */
rendition.on("relocated", function(location){
    
    const next = document.getElementById("next");
    const prev = document.getElementById("prev");

    if (location.atEnd) {
        next.style.visibility = "hidden";
    }else {
        next.style.visibility = "visible";
    }

    if (location.atStart) {
        prev.style.visibility = "hidden";
    } else {
        prev.style.visibility = "visible";
    }

});

/**
 * Select de capitulos options selected
 * 
 * Se ejecuta en cada chapter renderizado
 * 
 */
rendition.on("rendered", function(section){
    let currentHref = book?.navigation?.toc?.map(chapter => chapter.href.replace(/[#].*/, ''))
                                            .find(chapterHref => chapterHref === section.href)

    if (currentHref) {
        let $select = document.getElementById("toc");
        let $selected = $select.querySelector("option[selected]");
        
        if ($selected) {
            $selected.removeAttribute("selected");
        }

        let newSectionSelected = $select.querySelector(`option[ref="${currentHref}"]`);
        
        if(newSectionSelected){
            newSectionSelected.setAttribute("selected", true);
        }
        
    }

});

/**
 * Guardar la ultima selección de texto
 */
rendition.on("selected", async function(cfiRange, contents) {
    lastSelectedHightlight.cfirange = cfiRange;
    lastSelectedHightlight.contents = contents;
    lastSelectedHightlight.text = (await book.getRange(cfiRange)).toString();
})


this.rendition.themes.default({
    '::selection': {
      'background': 'rgba(255,255,0, 0.3)'
    },
    '.epubjs-hl' : {
      'fill': 'yellow', 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply'
    },
    '.epub-view': {
        'width': '100%'
    },
    '.epub-container': {
        'width': '100%'
    },

  });

/**
 * Marcar cfi y capitulo
 * 
 * @param {object} event 
 */
function markCurrent(event){

    event.preventDefault();

    localStorage.setItem('currentCfi', rendition.location.start.cfi);
    localStorage.setItem('chapter', rendition.location.start.href);

}

/**
 * Mostrar capitulo de libro
 * 
 * @param {event} target 
 */
function changeChapter({ target }){

    let index = target.selectedIndex,
        ref = target.options[index].getAttribute("ref");
        
    rendition.display(ref);
}

/**
 * Subrayar manualmente. 
 */
function pushHightlight(){

    hightLights.push(lastSelectedHightlight);

    lastSelectedHightlight.contents.window.getSelection().removeAllRanges();

    addHighlight(lastSelectedHightlight)
}

/**
 * Añadir subrayado al dom
 * 
 * @param {object} newHighlight 
 */
function addHighlight(newHighlight){
    const { cfirange } = newHighlight;

    rendition.annotations.add('highlight', cfirange)

    book.getRange(cfirange).then(function (range) {
        let fragmentLi = document.createElement('li'),
            hightlightContainer = document.getElementById('highlight');

        fragmentLi.classList.add('list-group-item');

        if (range) {
            let textHighlight = range.toString();

            fragmentLi.innerHTML = `
                <li class="list-group-item">
                    ${textHighlight}

                    <div cfiRange="${cfirange}" class="mt-2 container-actions">
                        <button class="btn btn-sm btn-outline-secondary actions-subrayado viewcfi">
                            <i class="bi bi-eye-fill viewcfi"></i>
                            Visualizar
                        </button>
                        <button class="btn btn-sm btn-outline-secondary actions-subrayado comments">
                            <i class="bi bi-chat-left-dots-fill comments"></i>
                            Comentarios
                        </button>
                        <button  class="btn btn-sm btn-outline-danger actions-subrayado trash">
                            <i class="bi bi-trash-fill trash"></i>
                        </button>
                    </div>
                    
                </li>
            `               
            hightlightContainer.appendChild(fragmentLi);
        }

    })
}

/**
 * Acciones de lista de subrayados
 * 
 * @param {*} target 
 */
function actionsHighlight({ target }){

    const cfiRange = target.closest('.container-actions').getAttribute('cfiRange');

    if(target.classList.contains('viewcfi')){
        rendition.display(cfiRange);
    }
    else if(target.classList.contains('comments')){
        alert("wii comentarios")
    }
    else if(target.classList.contains('trash')){
        
        rendition.annotations.remove(cfiRange);
        
        // remove list highlights
        hightLights = hightLights.filter(item => item.cfirange == cfiRange)
        
        // remove dom
        const li = target.closest('li')
        li.parentNode.remove(li)

    }
        
    
}