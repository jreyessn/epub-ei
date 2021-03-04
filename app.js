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

    prefixApi: 'http://localhost/empresainteligente/Biblioteca_Api_REST_Backend/',

    id_usuario: 1,

    async getDataBook(id_multimedia){
        return new Promise((resolve, reject) => {

            $.ajax({
                url: `${this.prefixApi}Multimedia/multimedia_by_id?id=${id_multimedia}=&is_epub=true`,
                type: 'get',
                dataType: 'json',
                success(response){
                    resolve(response.result)
                },
                error(error){
                    alert("Error en la petición")
                    reject(error)
                }
            })


        })
    },

    updateMarker(){
        return new Promise((resolve, reject) => {

            const body = {
                id: DataBook.marker?.id ? DataBook.marker.id : null,
                id_usuario:  this.id_usuario,
                id_multimedia:  DataBook.id,
                cfirange: rendition.location.end.cfi,
                chapter: rendition.location.end.href
            }
   
            $.ajax({
                url: `${this.prefixApi}Libros/actualizar_marcador`,
                type: 'post',
                data: body,
                success(response){
                    resolve(response.result)
                },
                error(error){
                    reject(error)
                }
            })

        })
    },
    
    storeHighlight(data){
        return new Promise((resolve, reject) => {

            const body = {
                id_usuario:  this.id_usuario,
                id_multimedia:  DataBook.id,
                cfirange: data.cfirange,
                text: data.text
            }

            $.ajax({
                url: `${this.prefixApi}Libros/guardar_subrayado`,
                type: 'post',
                data: body,
                success(response){
                    resolve(response.result)
                },
                error(error){
                    reject(error)
                }
            })

        })
    },
    
    destroyHighlight(highlight_id){
        return new Promise((resolve, reject) => {

            $.ajax({
                url: `${this.prefixApi}Libros/borrar_subrayado`,
                type: 'post',
                data: { id: highlight_id },
                success(response){
                    resolve(response)
                },
                error(error){
                    reject(error)
                }
            })

        })
    },
    
    storeNote(data){
        return new Promise((resolve, reject) => {

            const body = {
                id_usuario:  this.id_usuario,
                id_multimedia:  DataBook.id,
                nota: data.nota,
            }

            $.ajax({
                url: `${this.prefixApi}Libros/guardar_nota`,
                type: 'post',
                data: body,
                success(response){
                    resolve(response.result)
                },
                error(error){
                    reject(error)
                }
            })

        })
    },
    
    destroyNote(note_id){
        return new Promise((resolve, reject) => {

            $.ajax({
                url: `${this.prefixApi}Libros/borrar_nota`,
                type: 'post',
                data: { id: note_id },
                success(response){
                    resolve(response)
                },
                error(error){
                    reject(error)
                }
            })

        })
    }
} 

//

async function show(){
    DataBook = await ApiService.getDataBook(22);

    book = ePub(DataBook.archivo);
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
          elementTitle.innerHTML = DataBook.nombre;

    /**
     * limpiar divs contenedores
     */
    document.getElementById('highlight').innerHTML = '';
    document.getElementById('listNotes').innerHTML = '';

    DataBook.highlights.forEach(addHighlight)
    DataBook.notes.forEach(addNote)
}


/**
 * callback modal open
 * 
 */
$('.modal').on('shown.bs.modal', function () {
   
    rendition.start()

    if(DataBook?.marker?.cfirange){
        return rendition.display(DataBook.marker.cfirange);
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
    
    ApiService.updateMarker().then(result => {
        DataBook.marker = result;
    })

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

    ApiService.storeHighlight(lastSelectedHightlight).then(result => {

        DataBook.highlights.push({ ... result });
          
        addHighlight(result)
        
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
    const nota = document.querySelector('#note-textarea').value;

    if(nota == ''){
        return alert("Escribir la nota...")
    }

    ApiService.storeNote({ nota }).then(result => {

        DataBook.notes.push(result);
          
        addNote(result)

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
            ${dataNote.nota}

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
        
    ApiService.destroyNote(note_id).then(r => {
        
        DataBook.notes = DataBook.notes.filter(item => item.id != note_id)

        // remove dom
        const li = target.closest('li')
        
        li.parentNode.removeChild(li)
    })
}
