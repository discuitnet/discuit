import { Route, Switch, useRouteMatch } from 'react-router-dom';
import Dashboard from '.';
import { SVGComment } from '../../SVGs';
import DashboardPage from './DashboardPage';
import { SidebarMenuItem, SidebarTopic } from './Sidebar';

function ExampleDashboard() {
  const { path } = useRouteMatch();
  const homeURL = path;
  const aboutURL = `${path}/about`;
  const settingsURL = `${path}/general`;
  return (
    <Dashboard
      title="Example dashboard"
      sidebarMenu={
        <>
          <SidebarMenuItem name="Home" icon={<SVGComment />} to={homeURL} />
          <SidebarMenuItem name="About" icon={<SVGComment />} to={aboutURL} />
          <SidebarTopic name="Settings" />
          <SidebarMenuItem name="General" icon={<SVGComment />} to={settingsURL} />
        </>
      }
    >
      <Switch>
        <Route exact path={homeURL}>
          <DashboardPage title="Home page">
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Officiis nihil
              necessitatibus, cumque voluptatibus cupiditate reprehenderit inventore quod
              consequatur aperiam omnis eveniet repellendus fugiat molestiae incidunt illo totam
              maiores ad iste error veniam itaque non in dolore? Aut quis maiores consectetur
              voluptates eius perferendis. Repellat ab distinctio dolor magni eveniet reprehenderit
              debitis labore fugiat consequuntur dolore nostrum molestiae ea illum, laboriosam,
              voluptatibus cumque ullam. Totam, nam nemo fuga excepturi autem cumque reiciendis,
              dolor, cupiditate nihil iure perspiciatis optio temporibus corrupti! Sapiente eligendi
              ducimus adipisci sed dicta sit voluptates, voluptas autem sint maiores iure sunt
              deleniti laboriosam quam officia quibusdam optio beatae?
            </p>
          </DashboardPage>
        </Route>
        <Route exact path={aboutURL}>
          <DashboardPage title="About page" fullWidth>
            <h3>
              Lorem, ipsum dolor sit amet consectetur adipisicing elit. Adipisci dolorum, nesciunt
              distinctio alias quis blanditiis aperiam voluptatem vero a doloremque maiores corrupti
              unde harum tenetur similique laborum reprehenderit praesentium. Animi maxime ratione
              saepe. Dolorem dicta fuga, atque impedit repudiandae tempora assumenda deleniti nihil
              accusantium labore aliquam? Iure nostrum porro molestiae voluptates iste. Laborum,
              maiores. Commodi velit, error ducimus facilis natus odit adipisci alias earum qui fuga
              consequuntur voluptatem numquam modi minus at rerum aspernatur veritatis nam explicabo
              nesciunt. Ratione fugit sed nostrum ullam totam, ut mollitia deserunt saepe deleniti
              tenetur culpa et cum similique illum molestiae distinctio fuga excepturi accusantium,
              sint esse a earum perspiciatis. Dolore, iste minima libero illum eaque doloremque
              placeat sint ex, dolores et ullam qui recusandae expedita, blanditiis nobis itaque
              dolorem. Repellat ipsum quae vero mollitia alias ad soluta optio. Dolores ratione ipsa
              minima unde sunt facilis quaerat blanditiis non accusamus ea debitis dolor fuga nisi
              culpa, ex tenetur sint possimus, laboriosam tempore voluptate assumenda. In illum at,
              veritatis molestiae vel voluptate consequatur, temporibus natus ad numquam, officia
              accusantium dolores pariatur deleniti atque illo explicabo dignissimos dolor. Aut
              consectetur aspernatur sequi ad? Autem eligendi error nostrum vero optio, dolorum, non
              eveniet nobis incidunt vitae quisquam expedita cumque sint excepturi, ex placeat!
              Eaque fugit laboriosam ut ex. Voluptatibus incidunt, vero eligendi facilis numquam
              accusantium quae velit similique, facere est cumque voluptatum tempore inventore
              dolores nemo, eveniet accusamus commodi repudiandae in enim. Quo optio nemo quam vel
              fugit maxime, sunt iure perspiciatis veritatis quasi earum placeat iusto, minima
              architecto voluptas. Nemo omnis natus ipsam at minima iste qui nobis, quis aperiam
              adipisci aliquam sunt odio quod doloremque inventore repudiandae consequatur
              voluptate, molestiae, fuga numquam necessitatibus mollitia veritatis quas? Porro
              eaque, veniam maxime laboriosam voluptates, iste rerum fugiat error sunt distinctio
              modi ex natus placeat fugit nesciunt voluptas suscipit sed dicta ducimus esse itaque
              exercitationem adipisci libero cupiditate! Ipsa veniam expedita fuga incidunt placeat
              vero tempora, quod magnam provident odit quam, sit natus iusto illo. Nam, quam
              aspernatur enim modi, voluptatibus, deleniti voluptate veniam consequuntur quaerat
              commodi unde? Nam alias, blanditiis iste quibusdam mollitia nobis officia veniam,
              repellat soluta ea possimus sapiente doloremque deserunt sed porro eos autem
              voluptatum aspernatur minus ipsum sint quam, consequuntur consequatur dignissimos?
              Fugiat, similique amet numquam blanditiis, quos ipsum odio perspiciatis nam quis minus
              aperiam culpa. Labore officia, veniam modi ducimus animi deleniti tempore debitis?
              Ratione vel animi exercitationem obcaecati minima eaque molestias numquam praesentium
              qui molestiae! Perspiciatis culpa vitae itaque recusandae deleniti amet quidem ex
              mollitia maxime aliquid esse aspernatur sint unde maiores a doloremque quo harum eius,
              officia tempora ipsum. Libero ex illum doloribus distinctio voluptatum dignissimos
              omnis dolorum id, quae cum cupiditate? Magnam facilis totam nam sunt tempore assumenda
              quod quibusdam officia debitis voluptatum. Molestiae, nesciunt qui omnis at assumenda
              veritatis, nisi quasi, quae asperiores deleniti accusantium explicabo in? Velit, sequi
              adipisci nulla laboriosam debitis voluptatum, ad veritatis neque, earum repellendus
              officia. Sit facilis voluptas ullam fugit, enim velit quaerat id explicabo quisquam
              libero similique, voluptatibus ducimus magni saepe maxime quasi.
            </h3>
          </DashboardPage>
        </Route>
        <Route exact path={settingsURL}>
          <DashboardPage title="Settings page">
            <p>
              Lorem ipsum dolor, sit amet consectetur adipisicing elit. Unde dolor velit sequi nobis
              repellendus earum maxime laboriosam. Quia deserunt velit distinctio dolor dolore,
              nihil commodi? Rem, quisquam assumenda autem harum dolor beatae qui porro nobis sequi
              consequuntur aliquid pariatur fugit laudantium, inventore tempora nam. Ullam a quidem
              assumenda at doloribus reiciendis, necessitatibus nisi repudiandae sit accusamus
              explicabo molestias, quia, porro perferendis deserunt aliquid nesciunt repellendus
              excepturi. Ipsam amet deleniti consequatur fugit veritatis dolorum, veniam tempora
              molestias nisi soluta harum obcaecati. Accusantium eos quisquam enim. Alias fuga
              molestiae fugiat consequuntur, aspernatur quis ea voluptates id quas voluptatum modi
              velit eos nam.
            </p>
          </DashboardPage>
        </Route>
      </Switch>
    </Dashboard>
  );
}

export default ExampleDashboard;
