import { Contact, requestPermissionsAsync } from 'expo-contacts';
import { useState } from 'react';
import { Alert, Linking, StyleSheet } from 'react-native';
import { Button, Dialog, List, Portal } from 'react-native-paper';

import { opcoesContacto, type OpcaoContacto } from '@/domain/contacto';
import { textos } from '@/i18n';
import { mostrarErro } from '@/ui/confirmar';
import { avisar } from '@/ui/Guardar';
import { espaco, tema } from '@/ui/theme';

export interface DadosContacto {
  nome: string;
  /** `null` se o contacto não tiver telefone nem email (fica o que já estava). */
  contacto: string | null;
}

/**
 * Pede acesso aos contactos. Para ler os números do contacto escolhido, o Android exige a
 * permissão de leitura (o seletor sozinho só devolve o identificador).
 */
async function pedirPermissao(): Promise<boolean> {
  const r = await requestPermissionsAsync();
  if (r.granted) return true;
  if (!r.canAskAgain) {
    const t = textos();
    Alert.alert(t.contactos.semAcesso, t.contactos.semAcessoMensagem, [
      { text: t.comum.cancelar, style: 'cancel' },
      { text: t.contactos.abrirDefinicoes, onPress: () => Linking.openSettings() },
    ]);
  }
  return false;
}

/**
 * Botão "Escolher dos contactos": abre a lista de contactos do telemóvel e devolve o nome e
 * um telefone ou email. Se houver vários, pergunta qual. Os dados são copiados para o
 * orçamento; mudar o contacto depois não o altera.
 */
export function EscolherContacto({ aoEscolher }: { aoEscolher: (dados: DadosContacto) => void }) {
  const [aAbrir, setAAbrir] = useState(false);
  const [escolha, setEscolha] = useState<{ nome: string; opcoes: OpcaoContacto[] } | null>(null);
  const t = textos();

  async function abrir() {
    setAAbrir(true);
    try {
      if (!(await pedirPermissao())) return;
      const c = await Contact.presentPicker();
      if (!c) return;
      const [nome, telefones, emails] = await Promise.all([c.getFullName(), c.getPhones(), c.getEmails()]);
      const opcoes = opcoesContacto(telefones, emails);
      const n = (nome ?? '').trim();
      if (opcoes.length > 1) {
        setEscolha({ nome: n, opcoes });
        return;
      }
      if (opcoes.length === 0) avisar(t.contactos.semTelefoneNemEmail);
      aoEscolher({ nome: n, contacto: opcoes[0]?.valor ?? null });
    } catch (e) {
      mostrarErro(e);
    } finally {
      setAAbrir(false);
    }
  }

  function fechar() {
    setEscolha(null);
  }

  return (
    <>
      <Button
        mode="outlined"
        icon="account-box-outline"
        onPress={abrir}
        loading={aAbrir}
        disabled={aAbrir}
        style={styles.botao}>
        {t.contactos.escolher}
      </Button>
      <Portal>
        <Dialog visible={!!escolha} onDismiss={fechar} style={styles.dialogo}>
          <Dialog.Title numberOfLines={1}>{escolha?.nome || t.contactos.contacto}</Dialog.Title>
          <Dialog.Content style={styles.dialogoConteudo}>
            {escolha?.opcoes.map((o) => (
              <List.Item
                key={o.valor}
                title={o.valor}
                description={o.rotulo}
                style={styles.opcao}
                left={(p) => <List.Icon {...p} icon={o.tipo === 'email' ? 'email-outline' : 'phone-outline'} />}
                onPress={() => {
                  fechar();
                  aoEscolher({ nome: escolha.nome, contacto: o.valor });
                }}
              />
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={fechar}>{t.comum.cancelar}</Button>
            <Button
              onPress={() => {
                if (escolha) aoEscolher({ nome: escolha.nome, contacto: null });
                fechar();
              }}>
              {t.contactos.soNome}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  botao: { alignSelf: 'flex-start', marginBottom: espaco.xs },
  dialogo: { backgroundColor: tema.colors.surface },
  dialogoConteudo: { paddingHorizontal: espaco.s },
  opcao: { borderRadius: 12 },
});
