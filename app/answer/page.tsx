import { redirect } from 'next/navigation';

// Answer is rendered inline on /ask after form submission.
export default function AnswerPage() {
  redirect('/ask');
}
