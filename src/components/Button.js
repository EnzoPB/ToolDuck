import '../sass/components/Button.sass';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

function Button({children, onClick = function() {}, type = '', icon = false}) {
	return (
		<button className={'button '+type} onClick={onClick}>
			{icon &&
				<FontAwesomeIcon style={{paddingRight:'5px'}} icon={icon} />
			}
			{children}
		</button>
	);
}

export default Button;
