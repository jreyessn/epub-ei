/**
 * vars 
 */
var book, rendition, DataBook;

/**
 * Ultimo subrayado realizado
 */
var lastSelectedHightlight = {
    id: null,
    text: '',
    cfirange: '',
    clear() {
        this.text = '';
        this.cfirange = '';
    }
}

/**
 * simulacion api
 */
const ApiService = {

    async getDataBook(){
        const response = await fetch('./data.json');
        
        return await response.json()
    },

    updateDataBook(data){
        return new Promise((resolve, reject) => {
            resolve(true)
        })
    },
    
    storeHighlight(data){
        return new Promise((resolve, reject) => {
            // id random
            resolve({
                id: parseInt(Math.random(200) * 100)
            })
        })
    },
    
    destroyHighlight(highlight_id){
        return new Promise((resolve, reject) => {
            resolve(true)
        })
    },
    
    storeNote(data){
        return new Promise((resolve, reject) => {
            // id random
            resolve({
                id: parseInt(Math.random(200) * 100)
            })
        })
    },
    
    destroyNote(note_id){
        return new Promise((resolve, reject) => {
            resolve(true)
        })
    }
} 

//

async function show(){
    DataBook = await ApiService.getDataBook();

    book = ePub(DataBook.path);
    rendition = book.renderTo("viewer", {
        width: "100%",
        height: 600,
        ignoreClass: 'annotator-hl',
        manager: "continuous",
    });

    onReadyBook();

    $('.modal').modal('show');
}

function renderData(){
    const elementTitle = document.querySelector('#title-book');
          elementTitle.innerHTML = DataBook.title;

    DataBook.highlights.forEach(addHighlight)
    DataBook.notes.forEach(addNote)
}


/**
 * callback modal open
 * 
 */
$('.modal').on('shown.bs.modal', function () {
   
    rendition.start()

    if(DataBook.cfirange != '' && DataBook.cfirange != null){
        return rendition.display(DataBook.cfirange);
    }
    
    rendition.display();

})

/**
 * callback modal close
 * 
 */
$('.modal').on('hidden.bs.modal', function () {
   
   book.destroy();

   // remove listeners

   document.getElementById("next").removeEventListener("click", nextPage, false);
   document.getElementById("prev").removeEventListener("click", prevPage, false);
   document.getElementById('mark').removeEventListener('click', markCurrent, false)
   document.getElementById("toc").removeEventListener('change', changeChapter, false)
   document.getElementById('highlight').removeEventListener('click', actionsHighlight, false)
   document.getElementById('listNotes').removeEventListener('click', actionsNotes, false)
   document.getElementById('subrayar').removeEventListener('click', pushHightlight, false)

   document.getElementById("toc").options.length = 0;
   
})


function onReadyBook(){

    book.ready.then(() => {

        rendition.on("keyup", keyListener);

        document.addEventListener("keyup", keyListener);
        document.getElementById("next").addEventListener("click", nextPage);
        document.getElementById("prev").addEventListener("click", prevPage);
        document.getElementById('mark').addEventListener('click', markCurrent)
        document.getElementById("toc").addEventListener('change', changeChapter)
        document.getElementById('highlight').addEventListener('click', actionsHighlight)
        document.getElementById('listNotes').addEventListener('click', actionsNotes, false)
        document.getElementById('subrayar').addEventListener('click', pushHightlight)

        renderData();
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
            
            if(hrefValue == DataBook.chapter){
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
     * Select de capitulos
     * 
     * Listener se ejecuta en cada chapter renderizado
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
    rendition.on("selected", async function(cfirange, contents) {
        lastSelectedHightlight.cfirange = cfirange;
        lastSelectedHightlight.text = (await book.getRange(cfirange)).toString();
    })


    rendition.themes.default({
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
}


function keyListener(e){

    // Left Key
    if ((e.keyCode || e.which) == 37) {
        rendition.prev();
    }

    // Right Key
    if ((e.keyCode || e.which) == 39) 
        rendition.next();

};

function nextPage(e){
    e.preventDefault();
    rendition.next();
}

function prevPage(e){
    e.preventDefault();
    rendition.prev();
}

/**
 * Marcar cfi y capitulo
 * 
 * @param {object} event 
 */
function markCurrent(event){

    event.preventDefault();

    DataBook.cfirange = rendition.location.start.cfi;
    DataBook.chapter = rendition.location.start.href;
    
    ApiService.updateDataBook(DataBook).then( r => {})

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

    if(lastSelectedHightlight.text == '' && lastSelectedHightlight.cfirange == ''){
        return alert("No se ha subrayado...")
    }

    ApiService.storeHighlight(lastSelectedHightlight).then(response => {

        DataBook.highlights.push({ ... lastSelectedHightlight });
          
        addHighlight(lastSelectedHightlight)
        
        lastSelectedHightlight.clear();
    })
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
        fragmentLi.classList.add('mt-1');

        if (range) {
            let textHighlight = range.toString();

            fragmentLi.innerHTML = `
                    ${textHighlight}

                    <div cfirange="${cfirange}" class="mt-2 container-actions">
                        <button class="btn btn-sm btn-outline-secondary viewcfi">
                            <i class="bi bi-eye-fill viewcfi"></i>
                            Visualizar
                        </button>

                        <button  class="btn btn-sm btn-outline-danger trash">
                            Eliminar
                        </button>
                    </div>
    
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

    const cfirange = target.closest('.container-actions')?.getAttribute('cfirange');

    if(typeof cfirange == 'undefined')
        return;

    if(target.classList.contains('viewcfi')){
        rendition.display(cfirange);
    }
    else if(target.classList.contains('trash')){

        const highlight_id = DataBook.highlights.find(item => item.cfirange == cfirange)?.id;

        destroyHighlight(highlight_id, cfirange, target)
    }
        
    
}

/**
 * remove list highlights
 * 
 * @param {*} highlight_id id highlight db
 * @param {*} cfirange range
 * @param {*} target element html
 */
function destroyHighlight(highlight_id, cfirange, target){
        
    ApiService.destroyHighlight(highlight_id).then(r => {

        rendition.annotations.remove(cfirange);
        
        DataBook.highlights = DataBook.highlights.filter(item => item.cfirange != cfirange)

        // remove dom
        const li = target.closest('li')
        
        li.parentNode.removeChild(li)
    })
}

/**
 * guardar notas
 */
function saveNote(){
    const note = document.querySelector('#note-textarea').value;

    if(note == ''){
        return alert("Escribir la nota...")
    }

    ApiService.storeNote({ note }).then(response => {
        const dataNote = { id: response.id, note };

        DataBook.notes.push(dataNote);
          
        addNote(dataNote)

        document.querySelector('#note-textarea').value = '';
    })
}

/**
 * pintar notas en el dom
 * 
 * @param {object} dataNote
 */
function addNote(dataNote){

    let fragmentLi = document.createElement('li'),
        notesContainer = document.getElementById('listNotes');

    fragmentLi.classList.add('list-group-item');
    fragmentLi.classList.add('mt-1');

    fragmentLi.innerHTML = `
            ${dataNote.note}

            <div data-id="${dataNote.id}" class="mt-2 noteid">
                <button  class="btn btn-sm btn-outline-danger trash">
                    Eliminar
                </button>
            </div>

    `               
    notesContainer.appendChild(fragmentLi);
    
}

/**
 * eventos botones notas
 * 
 * @param {*} target 
 */
function actionsNotes({ target }){

    const noteid = target.closest('.noteid')?.getAttribute('data-id')

    if(typeof noteid == 'undefined')
        return;

    if(target.classList.contains('trash')){
        destroyNote(noteid, target)
    }
        
    
}

/**
 * elimiinar nota dom
 * 
 * @param {*} highlight_id id note
 * @param {*} target element html
 */
function destroyNote(note_id, target){
        
    ApiService.destroyHighlight(note_id).then(r => {
        
        DataBook.notes = DataBook.notes.filter(item => item.id != note_id)

        // remove dom
        const li = target.closest('li')
        
        li.parentNode.removeChild(li)
    })
}
