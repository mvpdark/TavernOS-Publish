import type {
	InputHTMLAttributes,
	MouseEventHandler,
	PointerEventHandler,
	TextareaHTMLAttributes,
} from "react";

type SharedTextControlProps = {
	className: string;
	value: string;
	placeholder?: string;
	onChange: (value: string) => void;
	onClick?: MouseEventHandler<HTMLInputElement | HTMLTextAreaElement>;
	onPointerDown?: PointerEventHandler<HTMLInputElement | HTMLTextAreaElement>;
};

export type TextControlProps =
	| (SharedTextControlProps & {
			control: "input";
			inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
			type?: InputHTMLAttributes<HTMLInputElement>["type"];
	  })
	| (SharedTextControlProps & {
			control: "textarea";
			rows?: TextareaHTMLAttributes<HTMLTextAreaElement>["rows"];
	  });

export const DEFAULT_LYRICS_PLACEHOLDER = "填写歌词，留空则按描述自动生成";

export function TextControl(props: TextControlProps) {
	if (props.control === "textarea") {
		return (
			<textarea
				className={props.className}
				value={props.value}
				placeholder={props.placeholder}
				rows={props.rows}
				onClick={props.onClick}
				onPointerDown={props.onPointerDown}
				onChange={(event) => props.onChange(event.target.value)}
			/>
		);
	}

	return (
		<input
			className={props.className}
			type={props.type ?? "text"}
			inputMode={props.inputMode}
			value={props.value}
			placeholder={props.placeholder}
			onClick={props.onClick}
			onPointerDown={props.onPointerDown}
			onChange={(event) => props.onChange(event.target.value)}
		/>
	);
}
