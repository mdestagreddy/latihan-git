import '../style.css'

const Welcome = (props) => {
    return (
        <>
            <div class="box">
                <h1>{props.key} Halo, perkenalkan nama saya {props.nama}.</h1>
                <h1>Saya dari kota {props.kota}</h1>
                <h1>Umur saya {props.umur}</h1>
            </div>
        </>
    )
}

export default Welcome